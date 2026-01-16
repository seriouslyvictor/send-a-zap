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
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  isWhatsAppConnected: boolean;
  isCheckingConnection: boolean;
}

export function Step4Review({
  onSubmit,
  onSaveAsDraft,
  onBack,
  campaignData,
  sampleContact,
  isWhatsAppConnected,
  isCheckingConnection,
}: Step4ReviewProps) {
  // Generate preview using actual data from sample contact
  const previewMessage = sampleContact
    ? renderMessage(campaignData.message, sampleContact, { fallback: "{{missing}}", validateLength: false })
    : campaignData.message;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Campaign Summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
          Resumo da Convocação:
        </h3>
        <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
          <div className="flex items-start sm:items-center gap-2 sm:gap-3">
            <FileText className="w-4 h-4 text-gray-500 shrink-0 mt-0.5 sm:mt-0" />
            <span className="w-24 sm:w-32 text-gray-600 dark:text-gray-400 shrink-0">Nome:</span>
            <span className="font-medium dark:text-gray-200 break-words">
              {campaignData.campaignName}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Users className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="w-24 sm:w-32 text-gray-600 dark:text-gray-400 shrink-0">Destinatários:</span>
            <span className="font-medium dark:text-gray-200">
              {campaignData.contactsCount} contatos
            </span>
          </div>
          <div className="flex items-start sm:items-center gap-2 sm:gap-3">
            <MessageSquare className="w-4 h-4 text-gray-500 shrink-0 mt-0.5 sm:mt-0" />
            <span className="w-24 sm:w-32 text-gray-600 dark:text-gray-400 shrink-0">Mensagem:</span>
            <span className="font-medium dark:text-gray-200 break-words line-clamp-2">
              {campaignData.message.substring(0, 50)}...
            </span>
          </div>
          {campaignData.imageUrl && (
            <div className="flex items-center gap-2 sm:gap-3">
              <ImageIcon className="w-4 h-4 text-gray-500 shrink-0" />
              <span className="w-24 sm:w-32 text-gray-600 dark:text-gray-400 shrink-0">Imagem:</span>
              <span className="font-medium dark:text-gray-200">Anexada</span>
            </div>
          )}
          <div className="flex items-center gap-2 sm:gap-3">
            <Settings className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="w-24 sm:w-32 text-gray-600 dark:text-gray-400 shrink-0">Intervalo:</span>
            <span className="font-medium dark:text-gray-200">
              {campaignData.messageDelay}s entre msgs
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <RotateCcw className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="w-24 sm:w-32 text-gray-600 dark:text-gray-400 shrink-0">Reenvios:</span>
            <span className="font-medium dark:text-gray-200">
              {campaignData.autoRetry
                ? `Ativado (máx ${campaignData.maxRetries})`
                : "Desativado"}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Clock className="w-4 h-4 text-gray-500 shrink-0" />
            <span className="w-24 sm:w-32 text-gray-600 dark:text-gray-400 shrink-0">Tempo est.:</span>
            <span className="font-medium dark:text-gray-200">
              {campaignData.estimatedMinutes} min
            </span>
          </div>
        </div>
      </div>

      {/* WhatsApp Connection Warning */}
      {!isCheckingConnection && !isWhatsAppConnected && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            Você precisa conectar uma conta do WhatsApp para iniciar a convocação.
            Clique no botão de conexão no canto superior direito para conectar.
          </AlertDescription>
        </Alert>
      )}

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
      <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-3">
        <Button variant="outline" onClick={onBack} className="w-full sm:w-auto order-1 sm:order-none">
          ← Voltar
        </Button>
        <div className="flex flex-col sm:flex-row gap-2 order-2 sm:order-none">
          <Button variant="outline" onClick={onSaveAsDraft} className="gap-2 w-full sm:w-auto">
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Salvar como Rascunho</span>
            <span className="sm:hidden">Salvar Rascunho</span>
          </Button>
          <Button
            onClick={onSubmit}
            className="bg-green-600 hover:bg-green-700 gap-2 w-full sm:w-auto"
            disabled={!isWhatsAppConnected || isCheckingConnection}
          >
            <Rocket className="w-4 h-4" />
            {isCheckingConnection ? "Verificando..." : "Iniciar Convocação"}
          </Button>
        </div>
      </div>
    </div>
  );
}
