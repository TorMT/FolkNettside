(function (global) {
  'use strict';

  const API_BASE = '/includes/brewing/api';

  function monthYearLabel(dateLike) {
    const date = dateLike ? new Date(dateLike) : new Date();
    const months = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
    if (Number.isNaN(date.getTime())) {
      const now = new Date();
      return months[now.getMonth()] + '-' + now.getFullYear();
    }
    return months[date.getMonth()] + '-' + date.getFullYear();
  }

  function sanitizeBatchName(value) {
    return String(value || '')
      .replace(/[\\/:*?"<>|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function buildFolderName(batchName, dateLike) {
    const safeBatch = sanitizeBatchName(batchName) || 'Brygg';
    return safeBatch + '_' + monthYearLabel(dateLike);
  }

  function parseJsonSafe(text) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }

  async function fetchLogIndex() {
    const response = await fetch(API_BASE + '/logs.php', { cache: 'no-store' });
    const text = await response.text();
    const data = parseJsonSafe(text);
    if (!response.ok) {
      throw new Error((data && data.error) || ('HTTP ' + response.status));
    }
    return data;
  }

  async function fetchLogDetail(slug) {
    const response = await fetch(API_BASE + '/logs.php?slug=' + encodeURIComponent(slug), { cache: 'no-store' });
    const text = await response.text();
    const data = parseJsonSafe(text);
    if (!response.ok) {
      throw new Error((data && data.error) || ('HTTP ' + response.status));
    }
    return data;
  }

  function extractFilename(disposition, fallback) {
    const match = /filename="?([^"]+)"?/i.exec(disposition || '');
    return match && match[1] ? match[1] : fallback;
  }

  async function exportLog(payload) {
    const response = await fetch(API_BASE + '/export.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      const data = parseJsonSafe(text);
      throw new Error((data && data.error) || ('HTTP ' + response.status));
    }

    const blob = await response.blob();
    const fallbackName = (payload && payload.folderName ? payload.folderName : 'brygglogg') + '.zip';
    const filename = extractFilename(response.headers.get('Content-Disposition'), fallbackName);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return filename;
  }

  global.BrewingLogTools = {
    buildFolderName,
    exportLog,
    fetchLogIndex,
    fetchLogDetail,
    monthYearLabel,
    sanitizeBatchName
  };
}(window));
