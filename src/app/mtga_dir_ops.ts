import fs from 'fs';
import {join} from 'path';

import {parseOldLogsHandler} from 'root/app/old-log-handler';
import {settingsStore} from 'root/app/settings-store/settings_store';
import {error} from 'root/lib/logger';

export function locateMtgaDir(checkPath: string | undefined): boolean {
  let pth = '';
  if (checkPath !== undefined) {
    pth = checkPath;
  } else {
    const pathElements = ['Wizards of the Coast', 'MTGA'];
    const x64 = process.arch === 'x64' || process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
    const progFiles = process.env[`ProgramFiles${x64 ? '(x86)' : ''}`];
    if (progFiles === undefined) {
      return false;
    }
    pth = join(progFiles, ...pathElements);
  }
  let result = false;
  const settings = settingsStore.get();

  try {
    const dir = fs.readdirSync(pth);
    dir.forEach((file) => {
      if (file === 'MTGA.exe') {
        result = true;
      }
    });
    settings.mtgaPath = result ? pth : undefined;
  } catch (e) {
    result = false;
    settings.mtgaPath = undefined;
  }

  return result;
}

interface MostRecentDate {
  date: number | undefined;
  fileId: string | undefined;
  logPath: string | undefined;
}

export function locateMostRecentDate(): MostRecentDate {
  const mtgaPath = settingsStore.get().mtgaPath;
  if (mtgaPath === undefined) {
    return {date: undefined, fileId: undefined, logPath: undefined};
  }
  let logDate: Date | undefined;
  let fileId: string | undefined;
  let logPath: string | undefined;
  const pth = join(mtgaPath, ...['MTGA_Data', 'Logs', 'Logs']);
  try {
    const files = fs.readdirSync(pth);
    files.forEach((file) => {
      logPath = join(pth, file);
      const ctime = fs.statSync(logPath).ctime;
      if (logDate === undefined || logDate < ctime) {
        logDate = ctime;
        fileId = file;
      }
    });
  } catch (e) {
    error('Error reading files in logs folder', e);
  }

  //console.log(fileId);
  return {date: logDate?.getTime(), fileId, logPath};
}

export function getOldLogs(): string[] | undefined {
  const mtgaPath = settingsStore.get().mtgaPath;
  if (mtgaPath === undefined) {
    return undefined;
  }
  const pth = join(mtgaPath, ...['MTGA_Data', 'Logs', 'Logs']);
  const files: string[] = [];
  try {
    fs.readdirSync(pth)
      .filter((file) => file.includes('UTC_Log') && file.includes('.log'))
      .forEach((file) => {
        files.push(join(mtgaPath, ...['MTGA_Data', 'Logs', 'Logs'], file));
      });
  } catch (e) {
    error('Error reading files in logs folder', e);
  }
  return files;
}

export function ShadowLogParse(): void {
  const logs = getOldLogs();
  if (logs === undefined) {
    return;
  }
  parseOldLogsHandler(logs, 0, 0, true);
}
