"use client";

import { useState } from "react";
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

interface Step1UploadProps {
  onNext: (contacts: Contact[]) => void;
  onCancel: () => void;
}

export function Step1Upload({ onNext, onCancel }: Step1UploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [previewContacts, setPreviewContacts] = useState<Contact[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const handleFileChange = (selectedFile: File) => {
    setFile(selectedFile);

    // Mock parsing
    const mockContacts: Contact[] = [
      { phone: "5511987654321", name: "João", course: "Course A", city: "SP" },
      { phone: "5521987654321", name: "Maria", course: "Course B", city: "RJ" },
      { phone: "5531987654321", name: "Pedro", course: "Course A", city: "MG" },
      { phone: "5541987654321", name: "Ana", course: "Course C", city: "PR" },
      { phone: "5551987654321", name: "Carlos", course: "Course B", city: "RS" },
    ];

    setContacts(mockContacts);
    setPreviewContacts(mockContacts.slice(0, 5));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".xlsx")) {
      handleFileChange(droppedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileChange(selectedFile);
  };

  return (
    <div className="space-y-6">
      {!file && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="text-5xl">📄</div>
            <p className="text-sm font-medium">Click or Drop XLSX file here</p>
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

      {file && (
        <>
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800">
              ✅ {file.name} uploaded ({contacts.length} rows)
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Preview:</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>City</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewContacts.map((contact, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{contact.phone}</TableCell>
                      <TableCell>{contact.name}</TableCell>
                      <TableCell>{contact.course}</TableCell>
                      <TableCell>{contact.city}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onNext(contacts)} disabled={contacts.length === 0}>
          Next: Compose →
        </Button>
      </div>
    </div>
  );
}
