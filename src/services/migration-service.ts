import { createServerClient } from '@supabase/ssr';
import type { cookies } from 'next/headers';

type CookieStore = Awaited<ReturnType<typeof cookies>>;

import {
  type Migration,
  migrations,
  generateChecksum,
  sortMigrations,
  compareVersions,
} from '@/lib/migrations';

export interface MigrationResult {
  version: string;
  description: string;
  status: 'success' | 'error' | 'skipped';
  executionTime?: number;
  error?: string;
}

export interface MigrationStatus {
  currentVersion: string;
  availableVersion: string;
  pendingMigrations: string[];
  appliedMigrations: {
    version: string;
    description: string;
    appliedAt: string;
    status: string;
  }[];
  isUpToDate: boolean;
}

export class MigrationService {
  private supabase: ReturnType<typeof createServerClient>;

  constructor(cookieStore: CookieStore) {
    this.supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Use service role key for migrations
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      },
    );
  }

  // Initialize the schema_versions table and functions
  async initializeVersioning(): Promise<boolean> {
    try {
      // Read the SQL file content
      const sql = `
        -- Create schema_versions table if it doesn't exist
        CREATE TABLE IF NOT EXISTS public.schema_versions (
          id SERIAL PRIMARY KEY,
          version VARCHAR(50) NOT NULL,
          description TEXT,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          applied_by UUID REFERENCES auth.users(id),
          script_name TEXT,
          checksum TEXT,
          execution_time INTEGER, -- in milliseconds
          status TEXT NOT NULL DEFAULT 'success',
          error_message TEXT
        );
        
        -- Create unique index on version
        CREATE UNIQUE INDEX IF NOT EXISTS schema_versions_version_idx ON public.schema_versions(version);

        -- Drop legacy migrations table if present
        DROP TABLE IF EXISTS public.migrations;
        
        -- Create function to get current schema version
        CREATE OR REPLACE FUNCTION get_current_schema_version()
        RETURNS VARCHAR AS $$
        DECLARE
          current_version VARCHAR(50);
        BEGIN
          SELECT version INTO current_version FROM public.schema_versions
          WHERE status = 'success'
          ORDER BY id DESC LIMIT 1;
          
          RETURN COALESCE(current_version, '0.0.0');
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- Create function to check if a version has been applied
        CREATE OR REPLACE FUNCTION is_version_applied(version_to_check VARCHAR)
        RETURNS BOOLEAN AS $$
        DECLARE
          version_exists BOOLEAN;
        BEGIN
          SELECT EXISTS(
            SELECT 1 FROM public.schema_versions
            WHERE version = version_to_check AND status = 'success'
          ) INTO version_exists;
          
          RETURN version_exists;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- Create function to register a new schema version
        CREATE OR REPLACE FUNCTION register_schema_version(
          p_version VARCHAR,
          p_description TEXT,
          p_applied_by UUID,
          p_script_name TEXT DEFAULT NULL,
          p_checksum TEXT DEFAULT NULL,
          p_execution_time INTEGER DEFAULT NULL,
          p_status TEXT DEFAULT 'success',
          p_error_message TEXT DEFAULT NULL
        )
        RETURNS BOOLEAN AS $$
        BEGIN
          INSERT INTO public.schema_versions (
            version,
            description,
            applied_by,
            script_name,
            checksum,
            execution_time,
            status,
            error_message
          ) VALUES (
            p_version,
            p_description,
            p_applied_by,
            p_script_name,
            p_checksum,
            p_execution_time,
            p_status,
            p_error_message
          );
          
          RETURN TRUE;
        EXCEPTION
          WHEN unique_violation THEN
            -- Version already exists, update it if it failed
            IF p_status = 'success' THEN
              RETURN FALSE;
            ELSE
              UPDATE public.schema_versions
              SET 
                description = p_description,
                applied_at = NOW(),
                applied_by = p_applied_by,
                script_name = p_script_name,
                checksum = p_checksum,
                execution_time = p_execution_time,
                status = p_status,
                error_message = p_error_message
              WHERE version = p_version;
              
              RETURN TRUE;
            END IF;
          WHEN OTHERS THEN
            RAISE;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
        
        -- Create function to get pending migrations
        CREATE OR REPLACE FUNCTION get_pending_migrations(available_versions VARCHAR[])
        RETURNS TABLE(version VARCHAR) AS $$
        BEGIN
          RETURN QUERY
          WITH available AS (
            SELECT unnest(available_versions) AS version
          ),
          applied AS (
            SELECT version FROM public.schema_versions
            WHERE status = 'success'
          )
          SELECT a.version
          FROM available a
          LEFT JOIN applied ap ON a.version = ap.version
          WHERE ap.version IS NULL
          ORDER BY a.version;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `;

      // Execute the SQL
      const { error } = await this.supabase.rpc('exec_sql', { sql });

      if (error) {
        console.error('Error initializing schema versioning:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error initializing schema versioning:', error);
      return false;
    }
  }

  // Get the current schema version
  async getCurrentVersion(): Promise<string> {
    try {
      const { data, error } = await this.supabase.rpc('get_current_schema_version');

      if (error) {
        console.error('Error getting current schema version:', error);
        return '0.0.0';
      }

      return data || '0.0.0';
    } catch (error) {
      console.error('Error getting current schema version:', error);
      return '0.0.0';
    }
  }

  // Check if a specific version has been applied
  async isVersionApplied(version: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.rpc('is_version_applied', {
        version_to_check: version,
      });

      if (error) {
        console.error(`Error checking if version ${version} is applied:`, error);
        return false;
      }

      return data || false;
    } catch (error) {
      console.error(`Error checking if version ${version} is applied:`, error);
      return false;
    }
  }

  // Get all applied migrations
  async getAppliedMigrations(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('schema_versions')
        .select('*')
        .order('applied_at', { ascending: false });

      if (error) {
        console.error('Error getting applied migrations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting applied migrations:', error);
      return [];
    }
  }

  // Get pending migrations
  async getPendingMigrations(): Promise<string[]> {
    try {
      const availableVersions = migrations.map((m) => m.version);

      const { data, error } = await this.supabase.rpc('get_pending_migrations', {
        available_versions: availableVersions,
      });

      if (error) {
        console.error('Error getting pending migrations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting pending migrations:', error);
      return [];
    }
  }

  // Get migration status
  async getMigrationStatus(): Promise<MigrationStatus> {
    const currentVersion = await this.getCurrentVersion();
    const appliedMigrations = await this.getAppliedMigrations();
    const pendingMigrations = await this.getPendingMigrations();

    // Get the highest available version
    const availableVersions = migrations.map((m) => m.version);
    const availableVersion = availableVersions.sort((a, b) => compareVersions(b, a))[0] || '0.0.0';

    return {
      currentVersion,
      availableVersion,
      pendingMigrations,
      appliedMigrations: appliedMigrations.map((m) => ({
        version: m.version,
        description: m.description,
        appliedAt: m.applied_at,
        status: m.status,
      })),
      isUpToDate: compareVersions(currentVersion, availableVersion) >= 0,
    };
  }

  // Apply a single migration
  async applyMigration(migration: Migration, userId: string): Promise<MigrationResult> {
    const startTime = Date.now();

    try {
      // Check if migration has already been applied
      const isApplied = await this.isVersionApplied(migration.version);

      if (isApplied) {
        return {
          version: migration.version,
          description: migration.description,
          status: 'skipped',
        };
      }

      // Generate checksum
      const checksum = generateChecksum(migration.sql);

      // Execute the migration
      const { error } = await this.supabase.rpc('exec_sql', { sql: migration.sql });

      if (error) {
        console.error(`Error applying migration ${migration.version}:`, error);

        // Register failed migration
        await this.supabase.rpc('register_schema_version', {
          p_version: migration.version,
          p_description: migration.description,
          p_applied_by: userId,
          p_script_name: migration.scriptName,
          p_checksum: checksum,
          p_execution_time: Date.now() - startTime,
          p_status: 'error',
          p_error_message: error.message,
        });

        return {
          version: migration.version,
          description: migration.description,
          status: 'error',
          executionTime: Date.now() - startTime,
          error: error.message,
        };
      }

      // Register successful migration
      await this.supabase.rpc('register_schema_version', {
        p_version: migration.version,
        p_description: migration.description,
        p_applied_by: userId,
        p_script_name: migration.scriptName,
        p_checksum: checksum,
        p_execution_time: Date.now() - startTime,
        p_status: 'success',
        p_error_message: null,
      });

      return {
        version: migration.version,
        description: migration.description,
        status: 'success',
        executionTime: Date.now() - startTime,
      };
    } catch (error: any) {
      console.error(`Error applying migration ${migration.version}:`, error);

      // Register failed migration
      await this.supabase
        .rpc('register_schema_version', {
          p_version: migration.version,
          p_description: migration.description,
          p_applied_by: userId,
          p_script_name: migration.scriptName,
          p_checksum: generateChecksum(migration.sql),
          p_execution_time: Date.now() - startTime,
          p_status: 'error',
          p_error_message: error.message || 'Unknown error',
        })
        .catch((e: unknown) => console.error('Error registering failed migration:', e));

      return {
        version: migration.version,
        description: migration.description,
        status: 'error',
        executionTime: Date.now() - startTime,
        error: error.message || 'Unknown error',
      };
    }
  }

  // Apply all pending migrations
  async applyPendingMigrations(userId: string): Promise<MigrationResult[]> {
    try {
      // Initialize versioning if needed
      await this.initializeVersioning();

      // Get pending migrations
      const pendingVersions = await this.getPendingMigrations();

      if (pendingVersions.length === 0) {
        return [];
      }

      // Get migration objects
      const pendingMigrations = pendingVersions
        .map((version) => migrations.find((m: Migration) => m.version === version))
        .filter((m): m is Migration => m !== undefined);

      // Sort migrations based on dependencies
      const sortedMigrations = sortMigrations(pendingMigrations);

      // Apply migrations in order
      const results: MigrationResult[] = [];

      for (const migration of sortedMigrations) {
        const result = await this.applyMigration(migration, userId);
        results.push(result);

        // Stop on error
        if (result.status === 'error') {
          break;
        }
      }

      return results;
    } catch (error) {
      console.error('Error applying pending migrations:', error);
      throw error;
    }
  }
}
