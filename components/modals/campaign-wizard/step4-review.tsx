"use client";

import {
  FileText,
  Users,
  MessageSquare,
  Image as ImageIcon,
  Settings,
  Clock,
  RotateCcw,
  Rocket,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderMessage } from "@/lib/message-renderer";

interface Step4ReviewProps {
  onSubmit: () => void;
  onSaveAsDraft: () => void;
  onBack: () => void;
  campaignData: {
    campaignName: string;
    contactsCount: number;
    message: string;
    imageUrl?: string;
    messageDelay: number;
    autoRetry: boolean;
    maxRetries: number;
    estimatedMinutes: number;
  };
  sampleContact?: Record<string, string>;
}

export function Step4Review({
  onSubmit,
  onSaveAsDraft,
  onBack,
  campaignData,
  sampleContact,
}: Step4ReviewProps) {
  // Generate preview using actual data from sample contact
  const previewMessage = sampleContact
    ? renderMessage(campaignData.message, sampleContact, { fallback: "{{missing}}", validateLength: false })
    : campaignData.message;

  return (
    <div className="space-y-6">
      {/* Campaign Summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Resumo da Convocação:
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="w-32 text-gray-600 dark:text-gray-400">Nome:</span>
            <span className="font-medium dark:text-gray-200">
              {campaignData.campaignName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="w-32 text-gray-600 dark:text-gray-400">Destinatários:</span>
            <span className="font-medium dark:text-gray-200">
              {campaignData.contactsCount} contatos
            </span>
          </div>
          <div className="flex items-center gap-3">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <span className="w-32 text-gray-600 dark:text-gray-400">Mensagem:</span>
            <span className="font-medium dark:text-gray-200">
              {campaignData.message.substring(0, 50)}...
            </span>
          </div>
          {campaignData.imageUrl && (
            <div className="flex items-center gap-3">
              <ImageIcon className="w-4 h-4 text-gray-500" />
              <span className="w-32 text-gray-600 dark:text-gray-400">Imagem:</span>
              <span className="font-medium dark:text-gray-200">Anexada</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4 text-gray-500" />
            <span className="w-32 text-gray-600 dark:text-gray-400">Intervalo:</span>
            <span className="font-medium dark:text-gray-200">
              {campaignData.messageDelay}s entre mensagens
            </span>
          </div>
          <div className="flex items-center gap-3">
            <RotateCcw className="w-4 h-4 text-gray-500" />
            <span className="w-32 text-gray-600 dark:text-gray-400">Reenvios:</span>
            <span className="font-medium dark:text-gray-200">
              {campaignData.autoRetry
                ? `Ativado (máx ${campaignData.maxRetries})`
                : "Desativado"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="w-32 text-gray-600 dark:text-gray-400">Tempo estimado:</span>
            <span className="font-medium dark:text-gray-200">
              {campaignData.estimatedMinutes} minutos
            </span>
          </div>
        </div>
      </div>

      {/* Message Preview */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {sampleContact
            ? "Prévia da Mensagem (com dados do primeiro contato):"
            : "Prévia da Mensagem:"}
        </h3>
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <pre className="text-sm whitespace-pre-wrap font-sans dark:text-gray-200">
            {previewMessage}
          </pre>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between gap-3">
        <Button variant="outline" onClick={onBack}>
          ← Voltar
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onSaveAsDraft} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar como Rascunho
          </Button>
          <Button onClick={onSubmit} className="bg-green-600 hover:bg-green-700 gap-2">
            <Rocket className="w-4 h-4" />
            Iniciar Convocação
          </Button>
        </div>
      </div>
    </div>
  );
}
