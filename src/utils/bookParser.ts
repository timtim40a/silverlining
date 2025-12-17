import { TextSegment, BookFormat } from '../types';
import JSZip from 'jszip';
import { DOMParser } from '@xmldom/xmldom';

const NBSP = '\u00A0'; // non-breaking space (won't collapse in HTML)
const SENTENCE_BREAK = NBSP.repeat(10); // 10 spaces for sentence/line breaks
const PARAGRAPH_BREAK = NBSP.repeat(25); // 25 spaces for paragraph breaks
const HEADING_GAP = NBSP.repeat(30); // 30 spaces for headings

export async function parseBook(file: File): Promise<TextSegment[]> {
  const format = getFileFormat(file.name);
  
  switch (format) {
    case 'txt':
      return parseTxt(file);
    case 'fb2':
      return parseFb2(file);
    case 'epub':
      return parseEpub(file);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}

function getFileFormat(filename: string): BookFormat {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'txt') return 'txt';
  if (ext === 'fb2') return 'fb2';
  if (ext === 'epub') return 'epub';
  throw new Error(`Unknown file format: ${ext}`);
}

function addSentenceBreaks(text: string): string {
  // Add extra spaces after sentence-ending punctuation
  return text.replace(/([.!?])(\s+)/g, '$1' + SENTENCE_BREAK);
}

async function parseTxt(file: File): Promise<TextSegment[]> {
  const text = await file.text();
  const segments: TextSegment[] = [];
  const lines = text.split(/\r?\n/);
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line === '') {
      if (i < lines.length - 1 && lines[i + 1].trim() !== '') {
        segments.push({ text: PARAGRAPH_BREAK, isParagraphBreak: true });
      }
      continue;
    }
    
    // Add sentence breaks within the line
    const processedLine = addSentenceBreaks(line);
    segments.push({ text: processedLine + SENTENCE_BREAK });
  }
  
  return segments;
}

async function parseFb2(file: File): Promise<TextSegment[]> {
  const text = await file.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/xml');
  
  const segments: TextSegment[] = [];
  const body = doc.getElementsByTagName('body')[0];
  
  if (!body) return segments;
  
  processFb2Node(body, segments);
  return segments;
}

function processFb2Node(node: any, segments: TextSegment[]): void {
  processFb2NodeWithContext(node, segments, false, false, false, false);
}

function processFb2Children(
  node: any,
  segments: TextSegment[],
  isHeading: boolean = false,
  inheritBold: boolean = false,
  inheritItalic: boolean = false,
  inheritUnderline: boolean = false
): void {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    
    if (child.nodeType === 3) { // Text node
      const text = child.nodeValue?.trim();
      if (text) {
        segments.push({
          text: addSentenceBreaks(text) + ' ',
          bold: isHeading || inheritBold,
          italic: inheritItalic,
          underline: inheritUnderline,
          isHeading
        });
      }
    } else if (child.nodeType === 1) {
      const tagName = child.tagName?.toLowerCase();
      const isBold = inheritBold || tagName === 'strong' || tagName === 'b';
      const isItalic = inheritItalic || tagName === 'emphasis' || tagName === 'i' || tagName === 'em';
      const isUnderline = inheritUnderline || tagName === 'u';
      
      // Recursively process with updated formatting context
      processFb2NodeWithContext(child, segments, isHeading, isBold, isItalic, isUnderline);
    }
  }
}

function processFb2NodeWithContext(
  node: any,
  segments: TextSegment[],
  isHeading: boolean = false,
  inheritBold: boolean = false,
  inheritItalic: boolean = false,
  inheritUnderline: boolean = false
): void {
  if (node.nodeType === 3) { // Text node
    const text = node.nodeValue?.trim();
    if (text) {
      segments.push({
        text: addSentenceBreaks(text) + ' ',
        bold: isHeading || inheritBold,
        italic: inheritItalic,
        underline: inheritUnderline,
        isHeading
      });
    }
    return;
  }
  
  if (node.nodeType !== 1) return; // Not an element node
  
  const tagName = node.tagName?.toLowerCase();
  
  // Handle headings
  if (tagName === 'title' || tagName === 'subtitle' || tagName?.startsWith('h')) {
    segments.push({ text: HEADING_GAP, isParagraphBreak: true });
    processFb2Children(node, segments, true, true, inheritItalic, inheritUnderline);
    segments.push({ text: HEADING_GAP, isParagraphBreak: true });
    segments.push({ text: PARAGRAPH_BREAK, isParagraphBreak: true });
    return;
  }
  
  // Handle paragraphs
  if (tagName === 'p' || tagName === 'empty-line') {
    if (tagName === 'empty-line') {
      segments.push({ text: PARAGRAPH_BREAK, isParagraphBreak: true });
      return;
    }
    
    processFb2Children(node, segments, isHeading, inheritBold, inheritItalic, inheritUnderline);
    segments.push({ text: PARAGRAPH_BREAK, isParagraphBreak: true });
    return;
  }
  
  // Handle styled text - update context
  const isBold = inheritBold || tagName === 'strong' || tagName === 'b';
  const isItalic = inheritItalic || tagName === 'emphasis' || tagName === 'i' || tagName === 'em';
  const isUnderline = inheritUnderline || tagName === 'u';
  
  processFb2Children(node, segments, isHeading, isBold, isItalic, isUnderline);
}


async function parseEpub(file: File): Promise<TextSegment[]> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  
  // Find the OPF file
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) throw new Error('Invalid EPUB: missing container.xml');
  
  const containerParser = new DOMParser();
  const containerDoc = containerParser.parseFromString(containerXml, 'text/xml');
  const opfPath = containerDoc.getElementsByTagName('rootfile')[0]?.getAttribute('full-path');
  if (!opfPath) throw new Error('Invalid EPUB: missing OPF path');
  
  const opfXml = await zip.file(opfPath)?.async('string');
  if (!opfXml) throw new Error('Invalid EPUB: missing OPF file');
  
  const opfParser = new DOMParser();
  const opfDoc = opfParser.parseFromString(opfXml, 'text/xml');
  
  // Get spine items
  const spineItems = opfDoc.getElementsByTagName('itemref');
  const manifestItems = opfDoc.getElementsByTagName('item');
  const manifestMap = new Map<string, string>();
  
  for (let i = 0; i < manifestItems.length; i++) {
    const item = manifestItems[i];
    const id = item.getAttribute('id');
    const href = item.getAttribute('href');
    if (id && href) {
      const basePath = opfPath.substring(0, opfPath.lastIndexOf('/') + 1);
      manifestMap.set(id, basePath + href);
    }
  }
  
  const segments: TextSegment[] = [];
  
  // Process each spine item
  for (let i = 0; i < spineItems.length; i++) {
    const itemref = spineItems[i];
    const idref = itemref.getAttribute('idref');
    if (!idref) continue;
    
    const href = manifestMap.get(idref);
    if (!href) continue;
    
    const htmlContent = await zip.file(href)?.async('string');
    if (!htmlContent) continue;
    
    const htmlParser = new DOMParser();
    const htmlDoc = htmlParser.parseFromString(htmlContent, 'text/html');
    const body = htmlDoc.getElementsByTagName('body')[0];
    
    if (body) {
      processEpubNode(body, segments);
    }
  }
  
  return segments;
}

function processEpubNode(node: any, segments: TextSegment[]): void {
  processEpubNodeWithContext(node, segments, false, false, false, false);
}

function processEpubChildren(
  node: any,
  segments: TextSegment[],
  isHeading: boolean = false,
  inheritBold: boolean = false,
  inheritItalic: boolean = false,
  inheritUnderline: boolean = false
): void {
  for (let i = 0; i < node.childNodes.length; i++) {
    const child = node.childNodes[i];
    
    if (child.nodeType === 3) { // Text node
      const text = child.nodeValue?.trim();
      if (text) {
        segments.push({
          text: addSentenceBreaks(text) + ' ',
          bold: isHeading || inheritBold,
          italic: inheritItalic,
          underline: inheritUnderline,
          isHeading
        });
      }
    } else if (child.nodeType === 1) {
      const tagName = child.tagName?.toLowerCase();
      const isBold = inheritBold || tagName === 'strong' || tagName === 'b';
      const isItalic = inheritItalic || tagName === 'em' || tagName === 'i';
      const isUnderline = inheritUnderline || tagName === 'u';
      
      // Recursively process with updated formatting context
      processEpubNodeWithContext(child, segments, isHeading, isBold, isItalic, isUnderline);
    }
  }
}

function processEpubNodeWithContext(
  node: any,
  segments: TextSegment[],
  isHeading: boolean = false,
  inheritBold: boolean = false,
  inheritItalic: boolean = false,
  inheritUnderline: boolean = false
): void {
  if (node.nodeType === 3) { // Text node
    const text = node.nodeValue?.trim();
    if (text) {
      segments.push({
        text: addSentenceBreaks(text) + ' ',
        bold: isHeading || inheritBold,
        italic: inheritItalic,
        underline: inheritUnderline,
        isHeading
      });
    }
    return;
  }
  
  if (node.nodeType !== 1) return;
  
  const tagName = node.tagName?.toLowerCase();
  
  // Handle headings
  if (tagName?.match(/^h[1-6]$/)) {
    segments.push({ text: HEADING_GAP, isParagraphBreak: true });
    processEpubChildren(node, segments, true, true, inheritItalic, inheritUnderline);
    segments.push({ text: HEADING_GAP, isParagraphBreak: true });
    segments.push({ text: PARAGRAPH_BREAK, isParagraphBreak: true });
    return;
  }
  
  // Handle paragraphs
  if (tagName === 'p') {
    processEpubChildren(node, segments, isHeading, inheritBold, inheritItalic, inheritUnderline);
    segments.push({ text: PARAGRAPH_BREAK, isParagraphBreak: true });
    return;
  }
  
  // Handle styled text - update context
  const isBold = inheritBold || tagName === 'strong' || tagName === 'b';
  const isItalic = inheritItalic || tagName === 'em' || tagName === 'i';
  const isUnderline = inheritUnderline || tagName === 'u';
  
  processEpubChildren(node, segments, isHeading, isBold, isItalic, isUnderline);
}

