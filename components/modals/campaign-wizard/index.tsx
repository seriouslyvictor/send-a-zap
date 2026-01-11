"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Step1Upload } from "./step1-upload";
import { Step2Compose } from "./step2-compose";
import { Step3Configure } from "./step3-configure";
import { Step4Review } from "./step4-review";

interface Contact {
  phone: string;
  name: string;
  [key: string]: string;
}

interface CampaignWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCampaignCreated?: () => void;
}

type WizardStep = 1 | 2 | 3 | 4;

export function CampaignWizard({
  open,
  onOpenChange,
  onCampaignCreated,
}: CampaignWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [message, setMessage] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [config, setConfig] = useState({
    campaignName: "",
    messageDelay: 10,
    autoRetry: false,
    maxRetries: 3,
    retryDelay: 5,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const stepTitles = {
    1: "Upload de Contatos",
    2: "Compor Mensagem",
    3: "Configurar Envio",
    4: "Revisar e Enviar",
  };

  const handleStep1Complete = (uploadedContacts: Contact[]) => {
    setContacts(uploadedContacts);
    setCurrentStep(2);
  };

  const handleStep2Complete = (data: { message: string; imageUrl?: string }) => {
    setMessage(data.message);
    setImageUrl(data.imageUrl);
    setCurrentStep(3);
  };

  const handleStep3Complete = (configData: typeof config) => {
    setConfig(configData);
    setCurrentStep(4);
  };

  function buildCampaignSummary(
    name: string,
    summary: { valid: number; invalid: number; blocked: number },
    started: boolean
  ): string {
    const title = started
      ? `Convocação "${name}" criada e iniciada com sucesso!`
      : `Rascunho "${name}" salvo com sucesso!`;

    const messageCount = started
      ? `${summary.valid} mensagens serão enviadas.`
      : `${summary.valid} mensagens prontas para envio.`;

    let result = `${title}\n\n${messageCount}`;

    if (summary.invalid > 0) {
      result += `\n${summary.invalid} contatos inválidos foram ignorados.`;
    }
    if (summary.blocked > 0) {
      result += `\n${summary.blocked} contatos bloqueados foram ignorados.`;
    }

    return result;
  }

  const createCampaign = async (startImmediately: boolean) => {
    setIsSubmitting(true);
    try {
      // Prepare contacts in the correct format
      const formattedContacts = contacts.map((contact) => ({
        phone: contact.phone,
        name: contact.name || "",
        customData: Object.fromEntries(
          Object.entries(contact).filter(
            ([key]) => key !== "phone" && key !== "name"
          )
        ),
      }));

      // Create campaign via API
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: config.campaignName,
          messageTemplate: message,
          imageUrl,
          contacts: formattedContacts,
          config: {
            batchSize: 50, // Auto-handled in background
            messageDelay: config.messageDelay,
            batchDelay: 30, // Auto-handled in background
            autoRetry: config.autoRetry,
            maxRetries: config.maxRetries,
            retryDelay: config.retryDelay,
          },
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Erro ao criar convocação");
      }

      const campaignId = data.data.id;

      // Start campaign if requested
      if (startImmediately) {
        const startResponse = await fetch(`/api/campaigns/${campaignId}/start`, {
          method: "POST",
        });

        const startData = await startResponse.json();

        if (!startData.success) {
          throw new Error(startData.error || "Erro ao iniciar convocação");
        }

        alert(buildCampaignSummary(config.campaignName, data.summary, true));
      } else {
        alert(buildCampaignSummary(config.campaignName, data.summary, false));
      }

      if (onCampaignCreated) {
        onCampaignCreated();
      }

      handleClose();
    } catch (error) {
      console.error("Error creating campaign:", error);
      alert(
        `Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => createCampaign(true);
  const handleSaveAsDraft = () => createCampaign(false);

  const handleClose = () => {
    setCurrentStep(1);
    setContacts([]);
    setMessage("");
    setImageUrl(undefined);
    setConfig({
      campaignName: "",
      messageDelay: 10,
      autoRetry: false,
      maxRetries: 3,
      retryDelay: 5,
    });
    onOpenChange(false);
  };

  function getPlaceholders(): string[] {
    if (contacts.length === 0) return [];
    return Object.keys(contacts[0]);
  }

  const calculateEstimatedMinutes = () => {
    const batchSize = 50;
    const batchDelay = 30;
    const batches = Math.ceil(contacts.length / batchSize);
    const timePerBatch = batchSize * config.messageDelay + batchDelay;
    const totalSeconds = batches * timePerBatch;
    return Math.floor(totalSeconds / 60);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Nova Convocação - Passo {currentStep}: {stepTitles[currentStep]}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {[1, 2, 3, 4].map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === currentStep
                    ? "bg-blue-600 text-white"
                    : step < currentStep
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                }`}
              >
                {step < currentStep ? <Check className="w-4 h-4" /> : step}
              </div>
              {index < 3 && (
                <div
                  className={`w-12 h-0.5 mx-1 ${
                    step < currentStep
                      ? "bg-green-500"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-6">
          <span>Upload</span>
          <span>Compor</span>
          <span>Configurar</span>
          <span>Revisar</span>
        </div>

        {/* Step Content */}
        {currentStep === 1 && (
          <Step1Upload onNext={handleStep1Complete} onCancel={handleClose} />
        )}

        {currentStep === 2 && (
          <Step2Compose
            onNext={handleStep2Complete}
            onBack={() => setCurrentStep(1)}
            placeholders={getPlaceholders()}
            sampleContact={contacts[0]}
          />
        )}

        {currentStep === 3 && (
          <Step3Configure
            onNext={handleStep3Complete}
            onBack={() => setCurrentStep(2)}
            contactsCount={contacts.length}
          />
        )}

        {currentStep === 4 && (
          <Step4Review
            onSubmit={handleSubmit}
            onSaveAsDraft={handleSaveAsDraft}
            onBack={() => setCurrentStep(3)}
            campaignData={{
              ...config,
              contactsCount: contacts.length,
              message,
              imageUrl,
              estimatedMinutes: calculateEstimatedMinutes(),
            }}
            sampleContact={contacts[0]}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
