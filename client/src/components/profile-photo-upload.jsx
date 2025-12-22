import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Image as ImageIcon, Link as LinkIcon, UploadCloud, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ProfilePhotoUpload({ currentPhoto, onSave }) {
    const [open, setOpen] = useState(false);
    const [uploadTab, setUploadTab] = useState("url");
    const [preview, setPreview] = useState(null);
    const [urlInput, setUrlInput] = useState("");
    const { toast } = useToast();

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                 toast({ variant: "destructive", title: "File too large", description: "Image size must be less than 2MB" });
                 return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result;
                setPreview(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        const newPhoto = preview || urlInput;
        if (newPhoto) {
            onSave(newPhoto);
            setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="relative group cursor-pointer">
                    <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
                        <AvatarImage src={currentPhoto} className="object-cover" />
                        <AvatarFallback className="text-2xl">U</AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-6 h-6 text-white" />
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Update Profile Photo</DialogTitle>
                </DialogHeader>
                
                <Tabs value={uploadTab} onValueChange={setUploadTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="url"><LinkIcon className="w-4 h-4 mr-2"/> Image URL</TabsTrigger>
                        <TabsTrigger value="file"><UploadCloud className="w-4 h-4 mr-2"/> Upload</TabsTrigger>
                    </TabsList>

                    <TabsContent value="url" className="pt-4 space-y-4">
                        <div className="space-y-2">
                            <Label>Image URL</Label>
                            <Input 
                                placeholder="https://example.com/photo.jpg" 
                                value={urlInput}
                                onChange={(e) => {
                                    setUrlInput(e.target.value);
                                    setPreview(e.target.value);
                                }}
                            />
                        </div>
                    </TabsContent>

                    <TabsContent value="file" className="pt-4">
                         <div className="flex items-center justify-center w-full">
                            <label htmlFor="profile-upload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <UploadCloud className="w-8 h-8 mb-2 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">Click to upload</p>
                                </div>
                                <input id="profile-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                            </label>
                        </div>
                    </TabsContent>

                    {(preview || urlInput) && (
                        <div className="flex justify-center pt-4">
                            <Avatar className="w-32 h-32 border-4 border-muted">
                                <AvatarImage src={preview || urlInput} className="object-cover" />
                                <AvatarFallback>Preview</AvatarFallback>
                            </Avatar>
                        </div>
                    )}

                    <DialogFooter className="pt-4">
                        <Button onClick={handleSave}>Save Photo</Button>
                    </DialogFooter>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
