"use client";

import { useState } from "react";
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
    batchSize: 50,
    messageDelay: 2,
    batchDelay: 30,
    autoRetry: false,
    maxRetries: 3,
    retryDelay: 5,
  });

  const stepTitles = {
    1: "Upload Contacts",
    2: "Compose Message",
    3: "Configure Sending",
    4: "Review & Send",
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

  const handleSubmit = async () => {
    // TODO: Call API to create campaign
    console.log("Creating campaign:", {
      contacts,
      message,
      imageUrl,
      config,
    });

    // Simulate API call
    alert("Campaign created successfully!");

    if (onCampaignCreated) {
      onCampaignCreated();
    }

    // Reset and close
    handleClose();
  };

  const handleClose = () => {
    setCurrentStep(1);
    setContacts([]);
    setMessage("");
    setImageUrl(undefined);
    setConfig({
      campaignName: "",
      batchSize: 50,
      messageDelay: 2,
      batchDelay: 30,
      autoRetry: false,
      maxRetries: 3,
      retryDelay: 5,
    });
    onOpenChange(false);
  };

  const getPlaceholders = (): string[] => {
    if (contacts.length === 0) return [];
    const keys = Object.keys(contacts[0]);
    return keys;
  };

  const calculateEstimatedMinutes = () => {
    const batches = Math.ceil(contacts.length / config.batchSize);
    const timePerBatch = config.batchSize * config.messageDelay + config.batchDelay;
    const totalSeconds = batches * timePerBatch;
    return Math.floor(totalSeconds / 60);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            New Campaign - Step {currentStep}: {stepTitles[currentStep]}
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
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {step < currentStep ? "✓" : step}
              </div>
              {index < 3 && (
                <div
                  className={`w-12 h-0.5 mx-1 ${
                    step < currentStep ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex justify-between text-xs text-gray-500 mb-6">
          <span>Upload</span>
          <span>Compose</span>
          <span>Configure</span>
          <span>Review</span>
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
            onBack={() => setCurrentStep(3)}
            campaignData={{
              ...config,
              contactsCount: contacts.length,
              message,
              imageUrl,
              estimatedMinutes: calculateEstimatedMinutes(),
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
