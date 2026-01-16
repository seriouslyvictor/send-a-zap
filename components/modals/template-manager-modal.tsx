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
import { Badge } from "@/components/ui/badge";

interface MessageTemplate {
  id: string;
  name: string;
  message: string;
  placeholders: string[];
  preview: string;
}

interface TemplateManagerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateSelected?: (template: MessageTemplate) => void;
}

export function TemplateManagerModal({
  open,
  onOpenChange,
  onTemplateSelected,
}: TemplateManagerModalProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(
    null
  );
  const [templates, setTemplates] = useState<MessageTemplate[]>([
    {
      id: "1",
      name: "Welcome Message",
      message:
        "Olá {{name}}!\n\nBem-vindo ao nosso curso sobre {{course}}.\nEstamos felizes em tê-lo conosco!",
      placeholders: ["name", "course"],
      preview: "Olá {{name}}!...",
    },
    {
      id: "2",
      name: "Course Reminder",
      message:
        "Oi {{name}}!\n\nLembrando que sua aula de {{course}} será amanhã às {{time}}.\nNão se atrase!",
      placeholders: ["name", "course", "time"],
      preview: "Oi {{name}}!...",
    },
    {
      id: "3",
      name: "Promotional Offer",
      message:
        "Olá {{name}}!\n\nTemos uma oferta especial para você: {{discount}}% de desconto no curso {{course}}.\nAproveite!",
      placeholders: ["name", "discount", "course"],
      preview: "Olá {{name}}!...",
    },
  ]);

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (id: string) => {
    // TODO: Implement edit functionality
    alert(`Edit template ${id}`);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      setTemplates((prev) => prev.filter((template) => template.id !== id));
      if (selectedTemplate?.id === id) {
        setSelectedTemplate(null);
      }
    }
  };

  const handleUseTemplate = () => {
    if (selectedTemplate && onTemplateSelected) {
      onTemplateSelected(selectedTemplate);
      onOpenChange(false);
    }
  };

  const handleNewTemplate = () => {
    // TODO: Implement new template creation
    alert("New template dialog will be implemented");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Message Templates</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search and New */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleNewTemplate} className="w-full sm:w-auto">+ New</Button>
          </div>

          {/* Templates Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto -mx-6 sm:mx-0">
            <div className="inline-block min-w-full align-middle">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Template Name</TableHead>
                  <TableHead className="whitespace-nowrap">Preview</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-gray-500">
                      No templates found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((template) => (
                    <TableRow
                      key={template.id}
                      className={`cursor-pointer ${
                        selectedTemplate?.id === template.id
                          ? "bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <TableCell className="font-medium">
                        {template.name}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {template.preview}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(template.id);
                            }}
                          >
                            ✏
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(template.id);
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            🗑
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
            </div>
          </div>

          {/* Selected Template Details */}
          {selectedTemplate && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  Selected: {selectedTemplate.name}
                </h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <pre className="text-sm whitespace-pre-wrap font-sans">
                    {selectedTemplate.message}
                  </pre>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Placeholders:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.placeholders.map((placeholder, index) => (
                    <Badge key={index} variant="outline">
                      {`{{${placeholder}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between gap-3 border-t pt-4">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {selectedTemplate && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleEdit(selectedTemplate.id)}
                    className="w-full sm:w-auto"
                  >
                    Edit
                  </Button>
                  <Button onClick={handleUseTemplate} className="w-full sm:w-auto">Use Template</Button>
                </>
              )}
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
              Close
            </Button>
          </div>
        </div>mailtempl
      </DialogContent>
    </Dialog>
  );
}
