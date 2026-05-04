import type { Chart, Plugin } from 'chart.js';

interface CenterPluginOptions {
  text: string;
  color?: string;
  fontStyle?: string;
  maxFontSize?: number;
  minFontSize?: number;
  sidePadding?: number;
  lineHeight?: number;
}

const GaugeCentralTextPlugin: Plugin<'doughnut'> = {
  id: 'center',
  afterDraw(chart: Chart<'doughnut'>) {
    const opts = chart.config.options;
    const centerConfig = (opts && opts.plugins && (opts.plugins as Record<string, unknown>).center) as CenterPluginOptions | undefined;
    if (!centerConfig) return;

    const { ctx } = chart;
    const fontStyle = centerConfig.fontStyle || 'Arial';
    const txt = centerConfig.text;
    const color = centerConfig.color || '#000';
    const maxFontSize = centerConfig.maxFontSize || 75;
    const sidePadding = centerConfig.sidePadding || 20;
    // eslint-disable-next-line no-underscore-dangle
    const metasets = (chart as unknown as { _metasets: Array<{ data: Array<{ innerRadius: number }> }> })._metasets;
    const { innerRadius } = metasets[metasets.length - 1].data[0];
    const sidePaddingCalculated = (sidePadding / 100) * (innerRadius * 2);

    ctx.font = `30px ${fontStyle}`;

    const stringWidth = ctx.measureText(txt).width;
    const elementWidth = (innerRadius * 2) - sidePaddingCalculated;

    const widthRatio = elementWidth / stringWidth;
    const newFontSize = Math.floor(30 * widthRatio);
    const elementHeight = (innerRadius * 2);

    let fontSizeToUse = Math.min(newFontSize, elementHeight, maxFontSize);

    let { minFontSize } = centerConfig;
    const lineHeight = centerConfig.lineHeight || 25;
    let wrapText = false;

    if (minFontSize === undefined) {
      minFontSize = 20;
    }

    if (minFontSize && fontSizeToUse < minFontSize) {
      fontSizeToUse = minFontSize;
      wrapText = true;
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const centerX = ((chart.chartArea.left + chart.chartArea.right) / 2);
    let centerY = ((chart.chartArea.top + chart.chartArea.bottom) / 2);
    ctx.font = `${fontSizeToUse}px ${fontStyle}`;
    ctx.fillStyle = color;

    if (!wrapText) {
      ctx.fillText(txt, centerX, centerY);
      return;
    }

    const words = txt.split(' ');
    let line = '';
    const lines: string[] = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = `${line + words[n]} `;
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > elementWidth && n > 0) {
        lines.push(line);
        line = `${words[n]} `;
      } else {
        line = testLine;
      }
    }

    centerY -= (lines.length / 2) * lineHeight;

    for (let n = 0; n < lines.length; n++) {
      ctx.fillText(lines[n], centerX, centerY);
      centerY += lineHeight;
    }
    ctx.fillText(line, centerX, centerY);
  },
};

export default GaugeCentralTextPlugin;
