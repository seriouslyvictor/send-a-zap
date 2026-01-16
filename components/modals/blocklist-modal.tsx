"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BlockedContact {
  id: string;
  phone: string;
  name: string;
  addedOn: string;
}

interface BlocklistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BlocklistModal({ open, onOpenChange }: BlocklistModalProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [blocklist, setBlocklist] = useState<BlockedContact[]>([
    {
      id: "1",
      phone: "5511987654321",
      name: "João",
      addedOn: "Jan 5 2026",
    },
    {
      id: "2",
      phone: "5521987654321",
      name: "Maria",
      addedOn: "Jan 3 2026",
    },
    {
      id: "3",
      phone: "5531987654321",
      name: "Pedro",
      addedOn: "Dec 28 2025",
    },
    {
      id: "4",
      phone: "5541987654321",
      name: "Ana",
      addedOn: "Dec 20 2025",
    },
  ]);

  const filteredBlocklist = blocklist.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery)
  );

  const handleRemove = (id: string) => {
    if (confirm("Are you sure you want to remove this contact from the blocklist?")) {
      setBlocklist((prev) => prev.filter((contact) => contact.id !== id));
    }
  };

  const handleAddContact = () => {
    // TODO: Implement add contact dialog
    alert("Add contact dialog will be implemented");
  };

  const handleImportCSV = () => {
    // TODO: Implement CSV import
    alert("CSV import will be implemented");
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    alert("CSV export will be implemented");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Blocklist Management</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              🚫 Global Opt-Out List ({blocklist.length} contacts)
            </p>
          </div>

          {/* Search and Add */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddContact} className="w-full sm:w-auto">+ Add</Button>
          </div>

          {/* Blocklist Table */}
          <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
            <div className="overflow-x-auto -mx-6 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Phone</TableHead>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Added On</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBlocklist.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-gray-500">
                      No contacts found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBlocklist.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-mono text-sm">
                        {contact.phone}
                      </TableCell>
                      <TableCell>{contact.name}</TableCell>
                      <TableCell className="text-gray-500">
                        {contact.addedOn}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemove(contact.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          🗑
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Bulk Actions:
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" size="sm" onClick={handleImportCSV} className="w-full sm:w-auto">
                Import from CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="w-full sm:w-auto">
                Export to CSV
              </Button>
            </div>
          </div>

          {/* Close Button */}
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)} className="w-full sm:w-auto">Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
