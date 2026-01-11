"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Step3ConfigureProps {
  onNext: (config: {
    campaignName: string;
    messageDelay: number;
    autoRetry: boolean;
    maxRetries: number;
    retryDelay: number;
  }) => void;
  onBack: () => void;
  contactsCount: number;
}

export function Step3Configure({
  onNext,
  onBack,
  contactsCount,
}: Step3ConfigureProps) {
  const [campaignName, setCampaignName] = useState<string>("");
  const [messageDelay, setMessageDelay] = useState<string>("10");
  const [autoRetry, setAutoRetry] = useState<boolean>(false);
  const [maxRetries, setMaxRetries] = useState<string>("3");
  const [retryDelay, setRetryDelay] = useState<string>("5");

  const calculateEstimate = () => {
    const batchSize = 50; // Auto-handled in background
    const batchDelay = 30;
    const batches = Math.ceil(contactsCount / batchSize);
    const timePerBatch = batchSize * parseInt(messageDelay) + batchDelay;
    const totalSeconds = batches * timePerBatch;
    const minutes = Math.floor(totalSeconds / 60);
    return minutes;
  };

  const estimatedMinutes = calculateEstimate();

  const handleSubmit = () => {
    onNext({
      campaignName,
      messageDelay: parseInt(messageDelay),
      autoRetry,
      maxRetries: parseInt(maxRetries),
      retryDelay: parseInt(retryDelay),
    });
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Campaign Name */}
        <div className="space-y-2">
          <Label htmlFor="campaignName">Nome da Convocação:</Label>
          <Input
            id="campaignName"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="ex: Convocação Verão 2026"
          />
        </div>

        {/* Message Delay */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Configurações de Envio:
          </h3>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="messageDelay">Intervalo entre mensagens:</Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px]">
                  <p className="text-sm">
                    Uma variação aleatória será aplicada a este intervalo para simular comportamento humano e evitar detecção.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select value={messageDelay} onValueChange={setMessageDelay}>
              <SelectTrigger id="messageDelay">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 segundos</SelectItem>
                <SelectItem value="10">10 segundos</SelectItem>
                <SelectItem value="15">15 segundos</SelectItem>
                <SelectItem value="20">20 segundos</SelectItem>
                <SelectItem value="25">25 segundos</SelectItem>
                <SelectItem value="30">30 segundos</SelectItem>
                <SelectItem value="35">35 segundos</SelectItem>
                <SelectItem value="40">40 segundos</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              (Recomendado: 10-15 segundos)
            </p>
          </div>
        </div>

        {/* Retry Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Configurações de Reenvio:
          </h3>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoRetry"
              checked={autoRetry}
              onCheckedChange={(checked) => setAutoRetry(checked as boolean)}
            />
            <Label htmlFor="autoRetry" className="font-normal cursor-pointer">
              Reenviar automaticamente mensagens com falha
            </Label>
          </div>

          {autoRetry && (
            <>
              <div className="space-y-2">
                <Label htmlFor="maxRetries">Máximo de tentativas:</Label>
                <Select value={maxRetries} onValueChange={setMaxRetries}>
                  <SelectTrigger id="maxRetries">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retryDelay">Intervalo de reenvio:</Label>
                <Select value={retryDelay} onValueChange={setRetryDelay}>
                  <SelectTrigger id="retryDelay">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutos</SelectItem>
                    <SelectItem value="10">10 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">1 hora</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        {/* Estimate */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Tempo estimado de conclusão:</strong> ~{estimatedMinutes} minutos
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            ({contactsCount} contatos)
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            ← Voltar
          </Button>
          <Button onClick={handleSubmit} disabled={!campaignName}>
            Próximo: Revisar →
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
