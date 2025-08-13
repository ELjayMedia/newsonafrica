'use client';

import { AlertCircle, Copy, Check } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { COMMENT_SYSTEM_MIGRATION } from '@/lib/supabase-migrations';

export function MigrationGuide() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(COMMENT_SYSTEM_MIGRATION);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Alert variant="warning">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium">Database Migration Required</p>
          <p className="text-sm mt-1">
            The enhanced comment system requires a database update. Please run the following SQL in
            your Supabase SQL Editor:
          </p>
        </AlertDescription>
      </Alert>

      <div className="relative">
        <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto max-h-60 whitespace-pre-wrap">
          {COMMENT_SYSTEM_MIGRATION}
        </pre>
        <Button size="sm" variant="outline" className="absolute top-2 right-2" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span className="ml-1">{copied ? 'Copied' : 'Copy'}</span>
        </Button>
      </div>

      <div className="text-sm text-gray-600">
        <p className="font-medium">Instructions:</p>
        <ol className="list-decimal pl-5 space-y-1 mt-2">
          <li>Go to your Supabase project dashboard</li>
          <li>Click on "SQL Editor" in the left sidebar</li>
          <li>Create a "New Query"</li>
          <li>Paste the SQL commands above</li>
          <li>Click "Run" to execute the migration</li>
        </ol>
      </div>
    </div>
  );
}
