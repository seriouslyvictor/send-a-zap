"use client";

import { useState } from "react";
import { Sparkles, Paperclip, X } from "lucide-react";
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
import { renderMessage } from "@/lib/message-renderer";

interface Step2ComposeProps {
  onNext: (data: { message: string; imageUrl?: string }) => void;
  onBack: () => void;
  placeholders: string[];
  sampleContact?: Record<string, string>;
}

export function Step2Compose({ onNext, onBack, placeholders, sampleContact }: Step2ComposeProps) {
  const [message, setMessage] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const handleAIEnhance = () => {
    // TODO: Implement AI enhancement
    alert("Melhoria com IA será implementada em breve");
  };

  const handleLoadTemplate = () => {
    // TODO: Load from template
    if (selectedTemplate) {
      setMessage(
        "Olá {{name}}!\n\nTemos novidades sobre o curso {{course}}.\nVenha nos visitar em {{city}}!"
      );
    }
  };

  const handleSaveTemplate = () => {
    // TODO: Save as template
    alert("Salvar como modelo será implementado em breve");
  };

  const handleAttachImage = () => {
    // TODO: Implement image upload
    const mockImageUrl = "https://example.com/image.jpg";
    setImageUrl(mockImageUrl);
  };

  const handleRemoveImage = () => {
    setImageUrl(undefined);
  };

  function handleInsertPlaceholder(placeholder: string): void {
    setMessage(message + `{{${placeholder}}}`);
  }

  // Generate preview using actual data from sample contact
  const previewMessage = sampleContact
    ? renderMessage(message, sampleContact, { fallback: "{{missing}}", validateLength: false })
    : message;

  return (
    <div className="space-y-6">
      {/* Message Input */}
      <div className="space-y-2">
        <Label htmlFor="message">Mensagem:</Label>
        <div className="relative">
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Digite sua mensagem aqui..."
            className="min-h-[200px] resize-none"
          />
          <Button
            variant="outline"
            size="sm"
            className="absolute bottom-2 right-2 gap-2"
            onClick={handleAIEnhance}
          >
            <Sparkles className="w-4 h-4" />
            IA
          </Button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Caracteres: {message.length} | Campos dinâmicos detectados:{" "}
          {(message.match(/\{\{[^}]+\}\}/g) || []).length}
        </p>
      </div>

      {/* Available Placeholders */}
      {placeholders.length > 0 && (
        <div className="space-y-2">
          <Label>Campos dinâmicos disponíveis do upload:</Label>
          <div className="flex flex-wrap gap-2">
            {placeholders.map((placeholder, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950"
                onClick={() => handleInsertPlaceholder(placeholder)}
              >
                {`{{${placeholder}}}`}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Image Upload */}
      <div className="space-y-2">
        <Label htmlFor="image">Imagem (opcional):</Label>
        <div className="flex gap-2 items-center">
          {!imageUrl ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleAttachImage}
            >
              <Paperclip className="w-4 h-4" />
              Anexar Imagem
            </Button>
          ) : (
            <div className="flex items-center gap-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
              <Paperclip className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-700 dark:text-green-300">
                Imagem anexada
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-2"
                onClick={handleRemoveImage}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Templates */}
      <div className="space-y-2">
        <Label htmlFor="template">Modelos:</Label>
        <div className="flex gap-2">
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Carregar Modelo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="welcome">Mensagem de Boas-vindas</SelectItem>
              <SelectItem value="reminder">Lembrete de Curso</SelectItem>
              <SelectItem value="promo">Oferta Promocional</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleLoadTemplate}>
            Carregar
          </Button>
          <Button variant="outline" onClick={handleSaveTemplate}>
            Salvar Modelo
          </Button>
        </div>
      </div>

      {/* Preview */}
      {message && (
        <div className="space-y-2">
          <Label>
            {sampleContact
              ? "Prévia com dados do primeiro contato:"
              : "Prévia:"}
          </Label>
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <pre className="text-sm whitespace-pre-wrap font-sans dark:text-gray-200">
              {previewMessage}
            </pre>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          ← Voltar
        </Button>
        <Button onClick={() => onNext({ message, imageUrl })} disabled={!message}>
          Próximo: Configurar →
        </Button>
      </div>
    </div>
  );
}
