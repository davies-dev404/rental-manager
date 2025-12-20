import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Download, Trash2, Eye, Search, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

const typeColors = {
    lease: "bg-blue-500/15 text-blue-700 border-blue-500/20",
    property: "bg-purple-500/15 text-purple-700 border-purple-500/20",
    maintenance: "bg-orange-500/15 text-orange-700 border-orange-500/20",
    financial: "bg-green-500/15 text-green-700 border-green-500/20",
};

export default function DocumentsPage() {
    const { t } = useTranslation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [filterType, setFilterType] = useState("all");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    // Form state (simple for now)
    const [newDoc, setNewDoc] = useState({ type: "lease", name: "", usedBy: "General" });

    const { data: documents = [] } = useQuery({
        queryKey: ["documents"],
        queryFn: api.getDocuments
    });

    const mutation = useMutation({
        mutationFn: api.addDocument,
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ["documents"] });
             setIsDialogOpen(false);
             setNewDoc({ type: "lease", name: "", usedBy: "General" });
             toast({ title: "Document Uploaded", description: "File added to library." });
        }
    });

    const handleUpload = () => {
        if (!newDoc.name) return;
        mutation.mutate(newDoc);
    };

    const filteredDocs = filterType === "all" ? documents : documents.filter(doc => doc.type === filterType);
    return (<div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">{t('documents')}</h2>
          <p className="text-muted-foreground mt-1">{t('documents_desc') || "Manage leases, contracts, and property documents."}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="shadow-lg hover:shadow-xl transition-all">
              <Upload className="w-4 h-4 mr-2"/> {t('upload_document')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t('upload_document')}</DialogTitle>
              <DialogDescription>{t('upload_document_desc') || "Add a new document to your library."}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('document_type')}</Label>
                <Select value={newDoc.type} onValueChange={(val) => setNewDoc({...newDoc, type: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('select_type') || "Select type"}/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lease">{t('lease_agreement')}</SelectItem>
                    <SelectItem value="property">{t('property_document')}</SelectItem>
                    <SelectItem value="maintenance">{t('maintenance_log')}</SelectItem>
                    <SelectItem value="financial">{t('financial_document')}</SelectItem>
                    <SelectItem value="other">{t('other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">{t('choose_file')}</Label>
                <Input id="file" type="file" onChange={(e) => {
                    if(e.target.files?.[0]) {
                        setNewDoc({...newDoc, name: e.target.files[0].name });
                    }
                }}/>
              </div>
              <div className="space-y-2">
                <Label>{t('description')} / {t('name')}</Label>
                <Input placeholder="e.g., Lease for Unit A101" value={newDoc.description} onChange={(e) => setNewDoc({...newDoc, name: e.target.value || newDoc.name, description: e.target.value})}/>
              </div>
              <DialogFooter>
                <Button onClick={handleUpload} disabled={mutation.isPending}>
                    {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {t('upload')}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={filterType} onValueChange={setFilterType} className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="all">{t('all_documents') || "All Documents"} ({documents.length})</TabsTrigger>
          <TabsTrigger value="lease">{t('leases')}</TabsTrigger>
          <TabsTrigger value="property">{t('properties')}</TabsTrigger>
          <TabsTrigger value="maintenance">{t('maintenance')}</TabsTrigger>
          <TabsTrigger value="financial">{t('financial')}</TabsTrigger>
        </TabsList>

        <TabsContent value={filterType} className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>{t('documents_library')}</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                  <Input placeholder={t('search_placeholder')} className="pl-9 h-9"/>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>{t('name')}</TableHead>
                    <TableHead>{t('type')}</TableHead>
                    <TableHead>{t('size')}</TableHead>
                    <TableHead>{t('uploaded')}</TableHead>
                    <TableHead>{t('used_by')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((doc) => (<TableRow key={doc.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground"/>
                          <span className="font-medium text-sm">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeColors[doc.type]}>
                          {t(doc.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{doc.size}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{doc.uploadDate}</TableCell>
                      <TableCell className="text-sm">{doc.usedBy}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="w-4 h-4"/>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="w-4 h-4"/>
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4"/>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">{t('total_documents')}</p>
                <p className="text-3xl font-bold">{documents.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">{t('total_storage')}</p>
                <p className="text-3xl font-bold">
                    {(() => {
                        const totalSize = documents.reduce((acc, doc) => {
                             const size =  parseFloat(doc.size || "0");
                             const unit = (doc.size || "").includes("KB") ? 0.001 : 1;
                             return acc + (size * unit); 
                        }, 0);
                        return totalSize.toFixed(1) + " MB";
                    })()}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">{t('recent_uploads')}</p>
                <p className="text-3xl font-bold">
                    {(() => {
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        return documents.filter(d => new Date(d.uploadDate) > sevenDaysAgo).length;
                    })()}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>);
}
