"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Contact {
  phone: string;
  name: string;
  [key: string]: string;
}

interface UploadContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactsSelected?: (contacts: Contact[]) => void;
}

export function UploadContactsModal({
  open,
  onOpenChange,
  onContactsSelected,
}: UploadContactsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [previewContacts, setPreviewContacts] = useState<Contact[]>([]);
  const [blocklistCount, setBlocklistCount] = useState<number>(0);
  const [validContactsCount, setValidContactsCount] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);

    // Mock parsing - in production, use xlsx library
    const mockContacts: Contact[] = [
      {
        phone: "5511987654321",
        name: "João",
        custom1: "Course A",
        custom2: "SP",
      },
      {
        phone: "5521987654321",
        name: "Maria",
        custom1: "Course B",
        custom2: "RJ",
      },
      {
        phone: "5531987654321",
        name: "Pedro",
        custom1: "Course A",
        custom2: "MG",
      },
      {
        phone: "5541987654321",
        name: "Ana",
        custom1: "Course C",
        custom2: "PR",
      },
      {
        phone: "5551987654321",
        name: "Carlos",
        custom1: "Course B",
        custom2: "RS",
      },
    ];

    setContacts(mockContacts);
    setPreviewContacts(mockContacts.slice(0, 5));
    setBlocklistCount(12);
    setValidContactsCount(mockContacts.length - 12);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".xlsx")) {
      handleFileChange(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileChange(selectedFile);
    }
  };

  const handleUseContacts = () => {
    if (onContactsSelected && contacts.length > 0) {
      onContactsSelected(contacts);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-175">
        <DialogHeader>
          <DialogTitle>Upload Contacts</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Area */}
          {!file && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="text-5xl">📄</div>
                <p className="text-sm font-medium text-gray-700">
                  Click or Drop XLSX file here
                </p>
                <p className="text-xs text-gray-500">
                  Drag and drop your contacts file or click to browse
                </p>
              </div>
              <input
                id="file-input"
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileInput}
              />
            </div>
          )}

          {/* File Info */}
          {file && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">
                ✅ {file.name} uploaded ({contacts.length} rows)
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {previewContacts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">Preview:</h3>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Phone</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Custom1</TableHead>
                      <TableHead>Custom2</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewContacts.map((contact, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {contact.phone}
                        </TableCell>
                        <TableCell>{contact.name}</TableCell>
                        <TableCell>{contact.custom1}</TableCell>
                        <TableCell>{contact.custom2}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Blocklist Warning */}
          {blocklistCount > 0 && (
            <Alert className="bg-yellow-50 border-yellow-200">
              <AlertDescription className="text-yellow-800">
                ⚠️ {blocklistCount} contacts are on the blocklist
                <div className="mt-2 flex gap-2">
                  <Button variant="outline" size="sm">
                    View Blocklist
                  </Button>
                  <Button variant="outline" size="sm">
                    Remove from Upload
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Valid Contacts Count */}
          {validContactsCount > 0 && (
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800">
                ✅ {validContactsCount} contacts ready to send
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUseContacts}
              disabled={contacts.length === 0}
            >
              Use These Contacts
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
