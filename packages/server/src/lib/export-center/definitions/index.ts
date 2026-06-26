import { registerExport } from '../registry';
import { usersExportDefinition } from './users';

let registered = false;

export function registerExportDefinitions(): void {
  if (registered) return;
  registerExport(usersExportDefinition as unknown as Parameters<typeof registerExport>[0]);
  registered = true;
}
