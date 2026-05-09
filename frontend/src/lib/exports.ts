import { SocialKit, AuditReport, ResearchSummary, ArticleData } from "@/types/journalist.types";

export const buildExportHTML = (
  title: string,
  bodyContent: string,
  imageUrl?: string | null,
  socialKit?: SocialKit | null,
  audit?: AuditReport | null,
  researchSummary?: ResearchSummary | null,
  sources?: Array<{ title: string; url: string; description: string }> | null,
  dataInsights?: Array<{ label: string; value: number; context: string }> | null,
  articleData?: ArticleData | null
) => {
  const author = articleData?.user_email || "Slate";
  const date = new Date(articleData?.created_at || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const docId = articleData?.id || "N/A";
  const category = articleData?.category || "General";

  const imageSection = imageUrl
    ? `<div style="margin: 20px 0; text-align: center;"><img src="${imageUrl}" style="max-width: 100%; height: auto; border-radius: 4px;" alt="Cover image" /></div>`
    : "";

  const insightsSection = dataInsights?.length
    ? `
      <h2>Key Data Insights</h2>
      ${dataInsights.map(insight => `
        <div style="margin-bottom: 15px;">
          <p><strong>${insight.label}: ${insight.value}%</strong></p>
          <p style="font-size: 0.95em; color: #333;">${insight.context}</p>
        </div>
      `).join('')}
    `
    : "";

  const researchSection = researchSummary
    ? `
      <h2>Research Summary</h2>
      
      <h3>Core Facts</h3>
      <ul>
        ${(researchSummary.core_facts || []).map(f => `<li>${f}</li>`).join("")}
      </ul>

      <h3>Key Statistics</h3>
      <ul>
        ${(researchSummary.statistics || []).map(s => `<li>${s}</li>`).join("")}
      </ul>

      <h3>Emerging Trends</h3>
      <ul>
        ${(researchSummary.trends || []).map(t => `<li>${t}</li>`).join("")}
      </ul>

      <h3>Contrarian Perspectives</h3>
      <ul>
        ${(researchSummary.contrarian_perspectives || []).map(p => `<li>${p}</li>`).join("")}
      </ul>

      <h3>Hidden Challenges</h3>
      <ul>
        ${(researchSummary.hidden_challenges || []).map(c => `<li>${c}</li>`).join("")}
      </ul>

      <h3>Key Stakeholders</h3>
      <div style="margin-bottom: 20px;">
        ${(researchSummary.stakeholders || []).map(s => {
          if (typeof s === 'string') return `<p>&bull; ${s}</p>`;
          return `
            <p><strong>${s.name}:</strong> ${s.incentive}</p>
            <p style="font-size: 0.85em; color: #666; margin-bottom: 10px;">Conflict: ${s.conflict}</p>
          `;
        }).join("")}
      </div>

      <h3>Practical Examples</h3>
      <ul>
        ${(researchSummary.examples || []).map(e => `<li>${e}</li>`).join("")}
      </ul>
    `
    : "";

  const socialSection = socialKit
    ? `
      <div class="page-break"></div>
      <h2>Social Media Kit</h2>
      
      ${socialKit.twitter_thread ? `
        <h3>X (Twitter) Thread</h3>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          ${Array.isArray(socialKit.twitter_thread) 
            ? socialKit.twitter_thread.map((p, i) => `<p style="margin-bottom: 10px;"><strong>${i+1}/</strong> ${p}</p>`).join('')
            : `<p>${socialKit.twitter_thread}</p>`}
        </div>
      ` : ''}

      ${socialKit.linkedin_post ? `
        <h3>LinkedIn Post</h3>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p style="white-space: pre-wrap;">${socialKit.linkedin_post}</p>
        </div>
      ` : ''}

      ${socialKit.newsletter_blurb ? `
        <h3>Newsletter Snippet</h3>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <p>${socialKit.newsletter_blurb}</p>
        </div>
      ` : ''}
    `
    : "";

  const outlineSection = articleData?.outline
    ? `
      <div class="page-break"></div>
      <h2>Article Outline</h2>
      ${Object.entries(articleData.outline).map(([section, detail]) => `
        <h4>${section}</h4>
        <p style="font-size: 0.9em; color: #444;">${detail}</p>
      `).join("")}
    `
    : "";

  const sourcesSection = sources?.length
    ? `
      <div class="page-break"></div>
      <h2>References & Sources</h2>
      ${sources.map((s, i) => `
        <div class="source-item">
          <span class="source-title">${s.title}</span>
          <span class="source-url">${s.url}</span>
          <p class="source-desc">${s.description}</p>
        </div>
      `).join("")}
    `
    : "";

  const auditSection = audit
    ? `
      <h2>Editorial Audit</h2>
      <p><strong>Status:</strong> ${audit.status || 'Verified'}</p>
      <h4>Sentiment & Tone Analysis</h4>
      <p style="font-size: 0.9em;">${audit.sentiment_tone}</p>
      <h4>Entity Coverage</h4>
      <p style="font-size: 0.9em;">${audit.entity_coverage}</p>
      <h4>SEO Recommendations</h4>
      <p style="font-size: 0.9em; font-style: italic;">${audit.seo_recommendation}</p>
    `
    : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        @page { size: A4; margin: 25mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #000;
            background: #fff;
            max-width: 210mm;
            margin: 0 auto;
            padding: 25mm;
        }
        .header { border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .document-meta { padding: 10px 0; margin-bottom: 20px; font-size: 0.9em; border-bottom: 1px solid #000; }
        .document-meta p { margin: 5px 0; }
        h1 { font-size: 1.8em; color: #000; margin-bottom: 10px; }
        h2 { font-size: 1.4em; color: #000; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #000; padding-bottom: 5px; page-break-after: avoid; }
        h3 { font-size: 1.2em; color: #000; margin-top: 20px; margin-bottom: 10px; }
        h4 { font-size: 1em; color: #000; margin-top: 15px; margin-bottom: 8px; }
        p { margin-bottom: 12px; }
        ul, ol { margin-left: 20px; margin-bottom: 12px; }
        li { margin-bottom: 6px; }
        .source-item { padding: 10px 0; margin-bottom: 10px; border-bottom: 1px solid #ccc; }
        .source-title { font-weight: bold; display: block; margin-bottom: 5px; }
        .source-url { font-size: 0.85em; word-break: break-all; display: block; margin-bottom: 5px; color: #444; }
        .source-desc { font-size: 0.9em; color: #555; }
        .page-break { page-break-before: always; }
        @media print { body { padding: 0; } .page-break { page-break-before: always; } }
    </style>
</head>
<body>
    <div class="header">
        <h1>${title}</h1>
    </div>
    
    <div class="document-meta">
        <p><strong>Topic:</strong> ${title}</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Author:</strong> ${author}</p>
        <p><strong>Date:</strong> ${date}</p>
        <p><strong>Document ID:</strong> ${docId}</p>
    </div>
    
    <div class="content">
        ${bodyContent}
        ${imageSection}
    </div>
    
    <div class=""></div>
    ${insightsSection}
    ${researchSection}
    ${socialSection}
    ${outlineSection}
    ${sourcesSection}
    ${auditSection}
</body>
</html>
  `;
};

export const handleExportPDF = (
  title: string, 
  bodyContent: string, 
  imageUrl?: string | null, 
  socialKit?: SocialKit | null,
  audit?: AuditReport | null,
  researchSummary?: ResearchSummary | null,
  sources?: Array<{ title: string; url: string; description: string }> | null,
  dataInsights?: Array<{ label: string; value: number; context: string }> | null,
  articleData?: ArticleData | null
) => {
  if (typeof window === 'undefined') return;
  const fullHTML = buildExportHTML(title, bodyContent, imageUrl, socialKit, audit, researchSummary, sources, dataInsights, articleData);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(fullHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }
};

export const handleExportWord = (
  title: string, 
  bodyContent: string, 
  imageUrl?: string | null, 
  socialKit?: SocialKit | null,
  audit?: AuditReport | null,
  researchSummary?: ResearchSummary | null,
  sources?: Array<{ title: string; url: string; description: string }> | null,
  dataInsights?: Array<{ label: string; value: number; context: string }> | null,
  articleData?: ArticleData | null
) => {
  if (typeof window === 'undefined') return;
  const wordHTML = buildExportHTML(title, bodyContent, imageUrl, socialKit, audit, researchSummary, sources, dataInsights, articleData);
  const blob = new Blob(['\ufeff', wordHTML], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.replace(/\s+/g, '_')}_Full_Report.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const handleDownloadImage = (imageUrl: string, title: string) => {
  if (!imageUrl) return;
  const link = document.createElement('a');
  link.href = imageUrl;
  link.download = `cover_${title.replace(/\s+/g, '_')}.jpg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};