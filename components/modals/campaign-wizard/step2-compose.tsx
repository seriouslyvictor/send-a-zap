"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Step2ComposeProps {
  onNext: (data: { message: string; imageUrl?: string }) => void;
  onBack: () => void;
  placeholders: string[];
}

export function Step2Compose({ onNext, onBack, placeholders }: Step2ComposeProps) {
  const [message, setMessage] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const handleAIEnhance = () => {
    // TODO: Implement AI enhancement
    alert("AI enhancement will be implemented");
  };

  const handleLoadTemplate = () => {
    // TODO: Load from template
    if (selectedTemplate) {
      setMessage("Olá {{name}}!\n\nTemos novidades sobre o curso {{course}}.\nVenha nos visitar em {{city}}!");
    }
  };

  const handleSaveTemplate = () => {
    // TODO: Save as template
    alert("Save as template will be implemented");
  };

  const previewMessage = message
    .replace(/\{\{name\}\}/g, "João")
    .replace(/\{\{course\}\}/g, "Course A")
    .replace(/\{\{city\}\}/g, "São Paulo");

  return (
    <div className="space-y-6">
      {/* Message Input */}
      <div className="space-y-2">
        <Label htmlFor="message">Message:</Label>
        <div className="relative">
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message here..."
            className="min-h-[200px] resize-none"
          />
          <Button
            variant="outline"
            size="sm"
            className="absolute bottom-2 right-2"
            onClick={handleAIEnhance}
          >
            🤖 AI
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Characters: {message.length} | Placeholders detected:{" "}
          {(message.match(/\{\{[^}]+\}\}/g) || []).length}
        </p>
      </div>

      {/* Available Placeholders */}
      {placeholders.length > 0 && (
        <div className="space-y-2">
          <Label>Available placeholders from your upload:</Label>
          <div className="flex flex-wrap gap-2">
            {placeholders.map((placeholder, index) => (
              <Badge key={index} variant="outline" className="cursor-pointer">
                {`{{${placeholder}}}`}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Image Upload */}
      <div className="space-y-2">
        <Label htmlFor="image">Image (optional):</Label>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            📎 Attach Image
          </Button>
          <Button variant="outline" size="sm">
            No Image
          </Button>
        </div>
      </div>

      {/* Templates */}
      <div className="space-y-2">
        <Label htmlFor="template">Templates:</Label>
        <div className="flex gap-2">
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Load Template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="welcome">Welcome Message</SelectItem>
              <SelectItem value="reminder">Course Reminder</SelectItem>
              <SelectItem value="promo">Promotional Offer</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleLoadTemplate}>
            Load
          </Button>
          <Button variant="outline" onClick={handleSaveTemplate}>
            Save as Template
          </Button>
        </div>
      </div>

      {/* Preview */}
      {message && (
        <div className="space-y-2">
          <Label>Preview with sample data:</Label>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <pre className="text-sm whitespace-pre-wrap font-sans">
              {previewMessage}
            </pre>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          ← Back
        </Button>
        <Button onClick={() => onNext({ message, imageUrl })} disabled={!message}>
          Next: Configure →
        </Button>
      </div>
    </div>
  );
}
