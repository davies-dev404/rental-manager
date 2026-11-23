const crypto = require('crypto');
const SupportTicket = require('../../models/SupportTicket');
const User = require('../../models/User');
const sendEmail = require('../../utils/sendEmail');
const { escapeRegExp, isValidObjectId } = require('../../middleware/securityMiddleware');
const { logAdminAction } = require('../../utils/auditLogger');
const {
  registerAdminStream,
  registerUserStream,
  publishSupportEvent,
  sanitizeTicketForUser
} = require('../../services/supportRealtimeService');

const VALID_STATUSES = new Set(['open', 'in_progress', 'pending', 'resolved', 'closed']);
const VALID_CATEGORIES = new Set(['general', 'billing', 'payments', 'technical', 'account', 'complaint', 'bug', 'feature_request', 'demo_request', 'landing_inquiry']);
const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);

exports.listTickets = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const skip = (page - 1) * limit;
    const { search = '', status = 'all', category = 'all', priority = 'all', platform = 'all' } = req.query;

    const filter = {};
    if (status && status !== 'all' && VALID_STATUSES.has(String(status))) filter.status = String(status);
    if (category && category !== 'all' && VALID_CATEGORIES.has(String(category))) filter.category = String(category);
    if (priority && priority !== 'all' && VALID_PRIORITIES.has(String(priority))) filter.priority = String(priority);
    if (platform && platform !== 'all') filter.platform = String(platform).trim().toLowerCase();
    if (search && String(search).trim()) {
      const rx = new RegExp(escapeRegExp(String(search).trim()), 'i');
      filter.$or = [{ ticketNumber: rx }, { subject: rx }, { name: rx }, { email: rx }, { platformLabel: rx }];
    }

    const [total, items, statusAgg, platformAgg, resolvedTickets, admins] = await Promise.all([
      SupportTicket.countDocuments(filter),
      SupportTicket.find(filter)
        .populate('userId', 'name email role')
        .populate('assignedTo', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SupportTicket.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      SupportTicket.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$platform', 'makaziflow'] },
            label: { $first: { $ifNull: ['$platformLabel', 'MakaziFlow'] } },
            total: { $sum: 1 },
            open: {
              $sum: { $cond: [{ $in: ['$status', ['open', 'in_progress', 'pending']] }, 1, 0] }
            }
          }
        },
        { $sort: { total: -1 } }
      ]),
      SupportTicket.find({ resolvedAt: { $exists: true, $ne: null } }).select('createdAt resolvedAt').limit(200).lean(),
      User.find({ $or: [{ role: 'superadmin' }, { isSuperAdmin: true }] }).select('name email').lean()
    ]);

    const statusCounts = {};
    statusAgg.forEach((s) => { statusCounts[s._id] = s.count; });

    let avgResolutionHours = 0;
    if (resolvedTickets.length > 0) {
      const totalHrs = resolvedTickets.reduce((acc, t) => {
        const hrs = Math.max(0, (new Date(t.resolvedAt) - new Date(t.createdAt)) / (1000 * 60 * 60));
        return acc + hrs;
      }, 0);
      avgResolutionHours = Math.round((totalHrs / resolvedTickets.length) * 10) / 10;
    }

    const platforms = platformAgg.map((p) => ({
      id: p._id || 'makaziflow',
      label: p.label || (p._id === 'afrinextech' ? 'AfriNexTech' : p._id),
      total: p.total,
      open: p.open
    }));

    res.json({
      items,
      admins,
      platforms,
      summary: {
        open: statusCounts.open || 0,
        in_progress: statusCounts.in_progress || 0,
        pending: statusCounts.pending || 0,
        resolved: statusCounts.resolved || 0,
        closed: statusCounts.closed || 0,
        avgResolutionHours
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load support tickets' });
  }
};

exports.getTicketDetail = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id)
      .populate('userId', 'name email phone role')
      .populate('assignedTo', 'name email')
      .lean();
    if (!ticket) return res.status(404).json({ message: 'Support ticket not found' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load support ticket' });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: 'Support ticket not found' });

    const { status, category, priority, assignedTo, responseMessage, isInternalNote = false } = req.body || {};
    const prevState = { status: ticket.status, priority: ticket.priority, assignedTo: ticket.assignedTo };

    if (status && VALID_STATUSES.has(String(status))) {
      ticket.status = String(status);
      if (ticket.status === 'resolved' && !ticket.resolvedAt) ticket.resolvedAt = new Date();
      if (ticket.status === 'closed' && !ticket.closedAt) ticket.closedAt = new Date();
    }
    if (category && VALID_CATEGORIES.has(String(category))) ticket.category = String(category);
    if (priority && VALID_PRIORITIES.has(String(priority))) ticket.priority = String(priority);
    if (assignedTo !== undefined) {
      ticket.assignedTo = assignedTo && isValidObjectId(String(assignedTo)) ? assignedTo : undefined;
    }

    if (responseMessage && String(responseMessage).trim()) {
      const cleanMsg = String(responseMessage).trim();
      ticket.responses.push({
        authorId: req.user._id,
        authorName: req.user.name || 'Super Admin',
        authorRole: 'superadmin',
        message: cleanMsg,
        isInternalNote: Boolean(isInternalNote),
        createdAt: new Date()
      });
      if (!ticket.firstRespondedAt && !isInternalNote) {
        ticket.firstRespondedAt = new Date();
      }
      if (!status && ticket.status === 'open') {
        ticket.status = 'in_progress';
      }

      if (!isInternalNote && ticket.email && process.env.NODE_ENV !== 'test') {
        sendEmail({
          email: ticket.email,
          toName: ticket.name,
          subject: `[${ticket.ticketNumber}] Update on: ${ticket.subject}`,
          message: `<p>Hello ${ticket.name},</p><p>${cleanMsg.replace(/\n/g, '<br/>')}</p><p>Status: <strong>${ticket.status}</strong></p>`
        }).catch(() => {});
      }
    }

    ticket.updatedAt = new Date();
    await ticket.save();

    await logAdminAction({
      req,
      action: 'SUPPORT_TICKET_UPDATED',
      category: 'support',
      targetType: 'SupportTicket',
      targetId: String(ticket._id),
      details: `Updated ticket ${ticket.ticketNumber} (${ticket.status})${responseMessage ? ' + admin response recorded' : ''}`,
      previousState: prevState,
      newState: { status: ticket.status, priority: ticket.priority, assignedTo: ticket.assignedTo }
    });

    const populated = await SupportTicket.findById(ticket._id)
      .populate('userId', 'name email phone role')
      .populate('assignedTo', 'name email')
      .lean();

    publishSupportEvent({
      type: responseMessage ? 'admin_reply' : 'ticket_updated',
      ticket: populated,
      isInternalNote: Boolean(isInternalNote && !status && !priority && assignedTo === undefined)
    });

    res.json({ success: true, ticket: populated });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update support ticket' });
  }
};

exports.submitTicketFromUser = async (req, res) => {
  try {
    const { name, email, phone, subject, category = 'general', priority = 'medium', message, platform = 'makaziflow', platformLabel = 'MakaziFlow' } = req.body || {};
    const finalName = String(name || req.user?.name || '').trim();
    const finalEmail = String(email || req.user?.email || '').trim().toLowerCase();
    const finalSubject = String(subject || '').trim();
    const finalMessage = String(message || '').trim();

    if (!finalName || !finalEmail || !finalSubject || !finalMessage) {
      return res.status(400).json({ message: 'Name, email, subject, and message are required.' });
    }

    const ticketNumber = `TKT-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const ticket = await SupportTicket.create({
      ticketNumber,
      userId: req.user?._id || undefined,
      name: finalName,
      email: finalEmail,
      phone: phone ? String(phone).trim() : (req.user?.phone || ''),
      subject: finalSubject,
      category: VALID_CATEGORIES.has(String(category)) ? String(category) : 'general',
      priority: VALID_PRIORITIES.has(String(priority)) ? String(priority) : 'medium',
      platform: String(platform || 'makaziflow').trim().toLowerCase(),
      platformLabel: String(platformLabel || 'MakaziFlow').trim(),
      status: 'open',
      message: finalMessage
    });

    const populated = await SupportTicket.findById(ticket._id)
      .populate('userId', 'name email role')
      .lean();
    publishSupportEvent({ type: 'ticket_created', ticket: populated || ticket });

    res.status(201).json({ success: true, ticket });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to submit support ticket' });
  }
};

exports.replyFromUser = async (req, res) => {
  try {
    const cleanMsg = String(req.body?.message || '').trim();
    if (!cleanMsg) {
      return res.status(400).json({ message: 'Message text is required.' });
    }

    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ message: 'Support ticket not found.' });
    }

    const userEmail = String(req.user?.email || '').trim().toLowerCase();
    const isOwner =
      (ticket.userId && String(ticket.userId) === String(req.user._id)) ||
      (userEmail && ticket.email === userEmail);

    if (!isOwner) {
      return res.status(403).json({ message: 'Not authorized to reply to this ticket.' });
    }

    ticket.responses.push({
      authorId: req.user._id,
      authorName: req.user.name || ticket.name || 'User',
      authorRole: req.user.role || 'user',
      message: cleanMsg,
      isInternalNote: false,
      createdAt: new Date()
    });

    if (ticket.status === 'resolved' || ticket.status === 'pending' || ticket.status === 'closed') {
      ticket.status = 'open';
    }
    ticket.updatedAt = new Date();
    await ticket.save();

    const populated = await SupportTicket.findById(ticket._id)
      .populate('userId', 'name email phone role')
      .populate('assignedTo', 'name email')
      .lean();

    publishSupportEvent({ type: 'user_reply', ticket: populated });

    res.json({ success: true, ticket: sanitizeTicketForUser(populated) });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to send reply.' });
  }
};

exports.streamAdminSupport = (req, res) => {
  registerAdminStream(req, res);
};

exports.streamUserSupport = (req, res) => {
  registerUserStream(req, res, [req.user?._id, req.user?.email]);
};

exports.listMyTickets = async (req, res) => {
  try {
    const tickets = await SupportTicket.find({
      $or: [
        { userId: req.user._id },
        ...(req.user.email ? [{ email: String(req.user.email).toLowerCase() }] : [])
      ]
    })
      .select('ticketNumber subject category priority status message responses platform platformLabel createdAt updatedAt resolvedAt')
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(50)
      .lean();

    res.json(tickets.map(sanitizeTicketForUser));
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load your support tickets' });
  }
};
