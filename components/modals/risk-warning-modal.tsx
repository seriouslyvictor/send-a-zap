"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const STORAGE_KEY = "whatsapp-risk-warning-accepted";

interface RiskWarningModalProps {
  onAccept: () => void;
}

export function RiskWarningModal({ onAccept }: RiskWarningModalProps) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !localStorage.getItem(STORAGE_KEY);
  });

  useEffect(() => {
    const hasAccepted = localStorage.getItem(STORAGE_KEY);
    if (hasAccepted) {
      onAccept();
    }
  }, [onAccept]);

  const handleAccept = () => {
    // Store acceptance in localStorage
    localStorage.setItem(STORAGE_KEY, "true");
    setOpen(false);
    onAccept();
  };

  const handleGoToGoogle = () => {
    // Redirect to Google
    window.location.href = "https://www.google.com";
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
            </div>
            <DialogTitle className="text-lg sm:text-xl">
              Aviso Importante sobre Riscos
            </DialogTitle>
          </div>
        </DialogHeader>

        <DialogDescription className="space-y-4 text-sm sm:text-base">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            Essa ferramenta utiliza uma API não oficial do WhatsApp e pode acarretar em banimento ou bloqueio temporário do número.
          </p>

          <div className="space-y-3">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              Para reduzir os riscos, siga obrigatoriamente as boas práticas abaixo:
            </p>

            <ul className="space-y-2 list-none">
              <li className="flex gap-2">
                <span className="text-yellow-600 dark:text-yellow-500 flex-shrink-0">•</span>
                <span>Utilize apenas números dedicados, nunca seu número pessoal.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-600 dark:text-yellow-500 flex-shrink-0">•</span>
                <span>Envie mensagens com intervalos altos e volumes moderados.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-600 dark:text-yellow-500 flex-shrink-0">•</span>
                <span>Prefira lotes pequenos (até 40 envios por vez).</span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-600 dark:text-yellow-500 flex-shrink-0">•</span>
                <span>Não repita mensagens idênticas para o mesmo contato.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-600 dark:text-yellow-500 flex-shrink-0">•</span>
                <span>Envie mensagens apenas para contatos com consentimento ou interação prévia.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-600 dark:text-yellow-500 flex-shrink-0">•</span>
                <span>Evite conteúdo agressivo, spam, links em excesso ou linguagem promocional exagerada.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-600 dark:text-yellow-500 flex-shrink-0">•</span>
                <span>Respeite horários comerciais e pare os envios ao detectar falhas ou atrasos.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-600 dark:text-yellow-500 flex-shrink-0">•</span>
                <span>Nunca reenvie mensagens para contatos que pedirem para parar.</span>
              </li>
            </ul>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="font-bold text-red-900 dark:text-red-200">
              IMPORTANTE:
            </p>
            <p className="text-red-800 dark:text-red-300 mt-1">
              O uso inadequado é de inteira responsabilidade do usuário.
            </p>
          </div>
        </DialogDescription>

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={handleGoToGoogle}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Sair da Ferramenta
          </Button>
          <Button
            onClick={handleAccept}
            className="w-full sm:w-auto bg-yellow-600 hover:bg-yellow-700 text-white order-1 sm:order-2"
          >
            Estou ciente dos riscos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
