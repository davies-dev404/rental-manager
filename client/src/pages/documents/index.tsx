import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Upload, Download, Trash2, Eye, Plus, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const documents = [
  {
    id: "doc1",
    name: "Standard Lease Agreement",
    type: "lease",
    size: "2.4 MB",
    uploadDate: "2024-05-15",
    category: "Template",
    usedBy: "15 tenants"
  },
  {
    id: "doc2",
    name: "John Doe - Unit A101 Lease",
    type: "lease",
    size: "1.8 MB",
    uploadDate: "2024-05-01",
    category: "Tenant",
    usedBy: "John Doe"
  },
  {
    id: "doc3",
    name: "Property Insurance Certificate",
    type: "property",
    size: "512 KB",
    uploadDate: "2024-04-20",
    category: "Insurance",
    usedBy: "Sunset Apartments"
  },
  {
    id: "doc4",
    name: "Maintenance Log - May 2024",
    type: "maintenance",
    size: "890 KB",
    uploadDate: "2024-05-25",
    category: "Maintenance",
    usedBy: "All Properties"
  },
  {
    id: "doc5",
    name: "Tax Filing 2023",
    type: "financial",
    size: "3.2 MB",
    uploadDate: "2024-03-10",
    category: "Financial",
    usedBy: "Organization"
  },
];

const typeColors = {
  lease: "bg-blue-500/15 text-blue-700 border-blue-500/20",
  property: "bg-purple-500/15 text-purple-700 border-purple-500/20",
  maintenance: "bg-orange-500/15 text-orange-700 border-orange-500/20",
  financial: "bg-green-500/15 text-green-700 border-green-500/20",
};

export default function DocumentsPage() {
  const [filterType, setFilterType] = useState("all");

  const filteredDocs = filterType === "all" ? documents : documents.filter(doc => doc.type === filterType);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-heading font-bold tracking-tight text-gray-900 dark:text-white">Documents</h2>
          <p className="text-muted-foreground mt-1">Manage leases, contracts, and property documents.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="shadow-lg hover:shadow-xl transition-all">
              <Upload className="w-4 h-4 mr-2" /> Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>Add a new document to your library.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lease">Lease Agreement</SelectItem>
                    <SelectItem value="property">Property Document</SelectItem>
                    <SelectItem value="maintenance">Maintenance Log</SelectItem>
                    <SelectItem value="financial">Financial Document</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">Choose File</Label>
                <Input id="file" type="file" />
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input placeholder="e.g., Lease for Unit A101" />
              </div>
              <DialogFooter>
                <Button>Upload</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={filterType} onValueChange={setFilterType} className="space-y-6">
        <TabsList className="h-10">
          <TabsTrigger value="all">All Documents ({documents.length})</TabsTrigger>
          <TabsTrigger value="lease">Leases</TabsTrigger>
          <TabsTrigger value="property">Properties</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
        </TabsList>

        <TabsContent value={filterType} className="space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle>Documents Library</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Search documents..." className="pl-9 h-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Used By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocs.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-sm">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={typeColors[doc.type as keyof typeof typeColors]}>
                          {doc.type.charAt(0).toUpperCase() + doc.type.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{doc.size}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{doc.uploadDate}</TableCell>
                      <TableCell className="text-sm">{doc.usedBy}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Total Documents</p>
                <p className="text-3xl font-bold">{documents.length}</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Total Storage</p>
                <p className="text-3xl font-bold">12.3 MB</p>
              </CardContent>
            </Card>
            <Card className="border-border/50 shadow-sm">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Recent Uploads</p>
                <p className="text-3xl font-bold">3</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
