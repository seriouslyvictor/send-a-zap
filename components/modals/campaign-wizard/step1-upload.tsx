"use client";

import { useState } from "react";
import { Check, AlertCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SheetIcon } from "@/components/icons/sheet-icon";
import { parseXLSXFile, getPreviewData } from "@/lib/xlsx-parser";
import {
  detectPhoneColumn,
  getDetectionMessage,
} from "@/lib/phone-column-detector";

interface Contact {
  phone: string;
  name: string;
  [key: string]: string;
}

interface Step1UploadProps {
  onNext: (contacts: Contact[]) => void;
  onCancel: () => void;
}

export function Step1Upload({ onNext, onCancel }: Step1UploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewContacts, setPreviewContacts] = useState<Contact[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneColumn, setPhoneColumn] = useState<string | null>(null);
  const [detectionInfo, setDetectionInfo] = useState<string | null>(null);

  function resetFileState(): void {
    setFile(null);
    setContacts([]);
    setHeaders([]);
    setPreviewContacts([]);
    setPhoneColumn(null);
    setDetectionInfo(null);
  }

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);
    setError(null);

    try {
      // Parse the XLSX file
      const result = await parseXLSXFile(selectedFile);

      if (result.error) {
        setError(result.error);
        resetFileState();
        return;
      }

      if (result.totalRows === 0) {
        setError("O arquivo está vazio ou não contém dados válidos");
        resetFileState();
        return;
      }

      // Detect phone column by analyzing actual data
      const detection = detectPhoneColumn(
        result.data,
        result.headers,
        20, // Sample 20 rows
        0.5 // Require at least 50% confidence
      );

      if (!detection.columnName) {
        setError(
          "Nenhuma coluna com números de telefone válidos foi encontrada. " +
            "Certifique-se de que o arquivo contém uma coluna com telefones brasileiros no formato correto."
        );
        resetFileState();
        return;
      }

      // Warn if confidence is low
      if (detection.confidence < 0.7) {
        setDetectionInfo(
          `⚠️ ${getDetectionMessage(detection)} - Alguns números podem ser inválidos`
        );
      } else {
        setDetectionInfo(`✓ ${getDetectionMessage(detection)}`);
      }

      // Map the detected phone column to "phone" field
      // and keep all columns (including the phone column) for preview
      const mappedData = result.data.map((row) => {
        const phoneValue = row[detection.columnName!] || "";
        const mappedRow: Contact = {
          phone: phoneValue,
          name: row.name || row.Name || row.NOME || "",
        };

        // Add all columns as custom fields (including original phone column for preview)
        for (const [key, value] of Object.entries(row)) {
          mappedRow[key] = value;
        }

        return mappedRow;
      });

      // Store headers and data
      setHeaders(result.headers);
      setPhoneColumn(detection.columnName);
      setContacts(mappedData);
      setPreviewContacts(getPreviewData(mappedData, 5));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao processar o arquivo"
      );
      resetFileState();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileChange(selectedFile);
  };

  function handleRemoveFile(): void {
    resetFileState();
    setError(null);
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!file && !isLoading && (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <div className="flex flex-col items-center gap-4">
            <SheetIcon size={64} trigger="loop" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Clique ou arraste um arquivo XLSX/XLS/CSV aqui
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tamanho máximo: 10MB
              </p>
            </div>
          </div>
          <input
            id="file-input"
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileInput}
          />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <Alert>
          <Upload className="w-4 h-4 animate-pulse" />
          <AlertDescription>Processando arquivo...</AlertDescription>
        </Alert>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success State */}
      {file && !isLoading && !error && contacts.length > 0 && (
        <>
          <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-300">
              {file.name} carregado com sucesso ({contacts.length}{" "}
              {contacts.length === 1 ? "linha" : "linhas"})
            </AlertDescription>
          </Alert>

          {/* Detection Info */}
          {detectionInfo && (
            <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
                {detectionInfo}
              </AlertDescription>
            </Alert>
          )}

          {/* Preview Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Prévia (primeiras 5 linhas):
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemoveFile}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                Remover Arquivo
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((header, index) => (
                        <TableHead
                          key={index}
                          className={
                            header === phoneColumn
                              ? "bg-blue-100 dark:bg-blue-900 font-semibold"
                              : ""
                          }
                        >
                          {header}
                          {header === phoneColumn && (
                            <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                              (telefone)
                            </span>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewContacts.map((contact, rowIndex) => (
                      <TableRow key={rowIndex}>
                        {headers.map((header, colIndex) => (
                          <TableCell
                            key={colIndex}
                            className={
                              header === phoneColumn
                                ? "font-mono text-sm bg-blue-50 dark:bg-blue-950"
                                : ""
                            }
                          >
                            {contact[header] || "-"}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            {contacts.length > 5 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                ... e mais {contacts.length - 5}{" "}
                {contacts.length - 5 === 1 ? "linha" : "linhas"}
              </p>
            )}
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          onClick={() => onNext(contacts)}
          disabled={contacts.length === 0 || isLoading}
        >
          Próximo: Compor →
        </Button>
      </div>
    </div>
  );
}
