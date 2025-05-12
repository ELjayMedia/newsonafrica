"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Upload, FileText, AlertCircle, CheckCircle, X, Download } from "lucide-react"
import Papa from "papaparse"

type UserImportData = {
  email: string
  full_name?: string
  username?: string
  role?: string
  status?: string
  country?: string
}

type ValidationError = {
  row: number
  field: string
  message: string
}

type ImportResult = {
  success: number
  failed: number
  errors: Array<{ row: number; email: string; error: string }>
}

export function UserImport({ onImportComplete }: { onImportComplete: () => void }) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isOpen, setIsOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<UserImportData[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [step, setStep] = useState<"upload" | "validate" | "import" | "result">("upload")

  const resetState = () => {
    setFile(null)
    setParsedData([])
    setValidationErrors([])
    setIsUploading(false)
    setUploadProgress(0)
    setImportResult(null)
    setStep("upload")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)

    // Parse CSV file
    Papa.parse<UserImportData>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsedData(results.data)
        validateData(results.data)
        setStep("validate")
      },
      error: (error) => {
        toast({
          title: "Error parsing CSV",
          description: error.message,
          variant: "destructive",
        })
      },
    })
  }

  const validateData = (data: UserImportData[]) => {
    const errors: ValidationError[] = []

    data.forEach((row, index) => {
      // Check required fields
      if (!row.email) {
        errors.push({
          row: index + 1,
          field: "email",
          message: "Email is required",
        })
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        errors.push({
          row: index + 1,
          field: "email",
          message: "Invalid email format",
        })
      }

      // Validate role if provided
      if (row.role && !["user", "admin"].includes(row.role.toLowerCase())) {
        errors.push({
          row: index + 1,
          field: "role",
          message: "Role must be either 'user' or 'admin'",
        })
      }

      // Validate status if provided
      if (row.status && !["active", "suspended"].includes(row.status.toLowerCase())) {
        errors.push({
          row: index + 1,
          field: "status",
          message: "Status must be either 'active' or 'suspended'",
        })
      }
    })

    setValidationErrors(errors)
  }

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast({
        title: "Validation errors",
        description: "Please fix the errors before importing",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    setStep("import")

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 300)

      // Send data to API
      const response = await fetch("/api/admin/users/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ users: parsedData }),
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to import users")
      }

      const result = await response.json()
      setImportResult(result)
      setStep("result")

      toast({
        title: "Import completed",
        description: `Successfully imported ${result.success} users. ${result.failed} failed.`,
        variant: result.failed > 0 ? "default" : "success",
      })

      // Refresh user list after successful import
      if (result.success > 0) {
        onImportComplete()
      }
    } catch (error: any) {
      console.error("Import error:", error)
      toast({
        title: "Import failed",
        description: error.message || "An error occurred during import",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent =
      "email,full_name,username,role,status,country\nexample@example.com,John Doe,johndoe,user,active,Nigeria"
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "user_import_template.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const downloadErrorReport = () => {
    if (!importResult) return

    const errorRows = importResult.errors.map((err) => `${err.row},${err.email},"${err.error}"`)

    const csvContent = "Row,Email,Error\n" + errorRows.join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", "import_errors.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleClose = () => {
    resetState()
    setIsOpen(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Import Users
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Import Users</DialogTitle>
          <DialogDescription>Upload a CSV file to import multiple users at once.</DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="csv-file">Upload CSV File</Label>
                <Input id="csv-file" type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} />
              </div>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Template
              </Button>
            </div>

            <Alert>
              <FileText className="h-4 w-4" />
              <AlertTitle>CSV Format</AlertTitle>
              <AlertDescription>
                Your CSV should include these columns: email (required), full_name, username, role, status, country.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === "validate" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {file?.name} ({parsedData.length} users)
              </h3>
              <Button variant="ghost" size="sm" onClick={resetState}>
                <X className="h-4 w-4 mr-1" /> Change File
              </Button>
            </div>

            {validationErrors.length > 0 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Validation Errors</AlertTitle>
                <AlertDescription>
                  Found {validationErrors.length} errors in your data. Please fix them before importing.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="success" className="bg-green-50 text-green-800 border-green-200">
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Data Validated</AlertTitle>
                <AlertDescription>Your data looks good! Ready to import {parsedData.length} users.</AlertDescription>
              </Alert>
            )}

            {validationErrors.length > 0 && (
              <div className="max-h-[200px] overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validationErrors.map((error, index) => (
                      <TableRow key={index}>
                        <TableCell>{error.row}</TableCell>
                        <TableCell>{error.field}</TableCell>
                        <TableCell>{error.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="max-h-[200px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.slice(0, 5).map((user, index) => (
                    <TableRow key={index}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.full_name || "-"}</TableCell>
                      <TableCell>{user.username || "-"}</TableCell>
                      <TableCell>{user.role || "user"}</TableCell>
                    </TableRow>
                  ))}
                  {parsedData.length > 5 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-sm text-gray-500">
                        + {parsedData.length - 5} more users
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {step === "import" && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Importing Users</h3>
              <p className="text-sm text-gray-500 mb-4">Please wait while we import your users...</p>
              <Progress value={uploadProgress} className="h-2 mb-2" />
              <p className="text-xs text-gray-500">{uploadProgress}% complete</p>
            </div>
          </div>
        )}

        {step === "result" && importResult && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Import Results</h3>
              {importResult.failed > 0 && (
                <Button variant="outline" size="sm" onClick={downloadErrorReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Error Report
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-md bg-green-50 text-green-800">
                <div className="text-sm font-medium">Successfully Imported</div>
                <div className="text-2xl font-bold">{importResult.success}</div>
              </div>
              <div
                className={`p-4 border rounded-md ${importResult.failed > 0 ? "bg-red-50 text-red-800" : "bg-gray-50"}`}
              >
                <div className="text-sm font-medium">Failed</div>
                <div className="text-2xl font-bold">{importResult.failed}</div>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="max-h-[200px] overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResult.errors.map((error, index) => (
                      <TableRow key={index}>
                        <TableCell>{error.row}</TableCell>
                        <TableCell>{error.email}</TableCell>
                        <TableCell>{error.error}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          )}

          {step === "validate" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={validationErrors.length > 0 || parsedData.length === 0}>
                Import {parsedData.length} Users
              </Button>
            </>
          )}

          {step === "import" && (
            <Button variant="outline" disabled>
              Importing...
            </Button>
          )}

          {step === "result" && <Button onClick={handleClose}>Done</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
