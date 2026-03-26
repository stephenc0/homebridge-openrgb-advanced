const { HomebridgePluginUiServer } = require('@homebridge/plugin-ui-utils');
const { Client: OpenRGB } = require('openrgb-sdk');

class OpenRgbUiServer extends HomebridgePluginUiServer {
  constructor() {
    super();
    this.onRequest('/discover', this.handleDiscover.bind(this));
    this.onRequest('/identify', this.handleIdentify.bind(this));
    this.onRequest('/identify-zone', this.handleIdentifyZone.bind(this));
    this.onRequest('/test-wb', this.handleTestWb.bind(this));
    this.ready();
  }

  async handleDiscover({ host, port, name }) {
    const client = new OpenRGB(name || 'homebridge-ui', port || 6742, host || 'localhost');

    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 5000)),
    ]);

    const count = await client.getControllerCount();
    const devices = [];
    for (let i = 0; i < count; i++) {
      try {
        const device = await client.getControllerData(i);
        devices.push({
          name: device.name,
          location: device.location,
          ledCount: device.colors?.length ?? device.leds?.length ?? 1,
          zones: (device.zones ?? []).map(z => ({ name: z.name, ledCount: z.ledsCount })),
        });
      } catch (_) {}
    }

    try { client.disconnect(); } catch (_) {}

    return { devices };
  }

  async handleIdentify({ host, port, name: serverName, deviceName, location }) {
    const client = new OpenRGB(serverName || 'homebridge-ui', port || 6742, host || 'localhost');

    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 5000)),
    ]);

    const count = await client.getControllerCount();
    let target = null;
    for (let i = 0; i < count; i++) {
      try {
        const device = await client.getControllerData(i);
        if (device.name === deviceName && (!location || device.location === location)) {
          target = device;
          break;
        }
      } catch (_) {}
    }

    if (!target) throw new Error(`Device "${deviceName}" not found on server`);

    const ledCount = target.colors.length;
    const original = target.colors;
    const white = Array(ledCount).fill({ red: 255, green: 255, blue: 255 });
    const off = Array(ledCount).fill({ red: 0, green: 0, blue: 0 });
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    for (let i = 0; i < 3; i++) {
      await client.updateLeds(target.deviceId, white);
      await sleep(300);
      await client.updateLeds(target.deviceId, off);
      await sleep(300);
    }
    await client.updateLeds(target.deviceId, original);

    try { client.disconnect(); } catch (_) {}

    return { ok: true };
  }

  async handleIdentifyZone({ host, port, name: serverName, deviceName, location, zoneName }) {
    const client = new OpenRGB(serverName || 'homebridge-ui', port || 6742, host || 'localhost');

    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 5000)),
    ]);

    const count = await client.getControllerCount();
    let target = null;
    for (let i = 0; i < count; i++) {
      try {
        const device = await client.getControllerData(i);
        if (device.name === deviceName && (!location || device.location === location)) {
          target = device;
          break;
        }
      } catch (_) {}
    }

    if (!target) throw new Error(`Device "${deviceName}" not found`);

    const zoneIndex = (target.zones ?? []).findIndex(z => z.name === zoneName);
    if (zoneIndex < 0) throw new Error(`Zone "${zoneName}" not found`);

    let startIndex = 0;
    for (let i = 0; i < zoneIndex; i++) startIndex += target.zones[i].ledsCount;
    const zoneSize = target.zones[zoneIndex].ledsCount;

    const original = [...target.colors];
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    for (let f = 0; f < 3; f++) {
      const on = original.map((c, i) =>
        i >= startIndex && i < startIndex + zoneSize ? { red: 255, green: 255, blue: 255 } : c);
      const off = original.map((c, i) =>
        i >= startIndex && i < startIndex + zoneSize ? { red: 0, green: 0, blue: 0 } : c);
      await client.updateLeds(target.deviceId, on);
      await sleep(300);
      await client.updateLeds(target.deviceId, off);
      await sleep(300);
    }
    await client.updateLeds(target.deviceId, original);

    try { client.disconnect(); } catch (_) {}

    return { ok: true };
  }

  async handleTestWb({ host, port, name: serverName, deviceName, location, zoneName, wb, tint, sat, oldWb, oldTint, oldSat }) {
    const client = new OpenRGB(serverName || 'homebridge-ui', port || 6742, host || 'localhost');

    await Promise.race([
      client.connect(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timed out')), 5000)),
    ]);

    const count = await client.getControllerCount();
    let target = null;
    for (let i = 0; i < count; i++) {
      try {
        const device = await client.getControllerData(i);
        if (device.name === deviceName && (!location || device.location === location)) {
          target = device;
          break;
        }
      } catch (_) {}
    }

    if (!target) throw new Error(`Device "${deviceName}" not found`);

    // HSV helpers for saturation undo/apply
    const rgbToHsv = (r, g, b) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
      let h = 0;
      if (d !== 0) {
        if (max === r) h = ((g - b) / d + 6) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
      }
      return [h * 360, max === 0 ? 0 : d / max * 100, max * 100];
    };
    const hsvToRgb = (h, s, v) => {
      h /= 60; s /= 100; v /= 100;
      const i = Math.floor(h) % 6, f = h - Math.floor(h);
      const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
      const vals = [[v,t,p,p,q,v],[q,v,v,t,p,p],[p,p,q,v,v,t]];
      return { red: Math.round(vals[0][i]*255), green: Math.round(vals[1][i]*255), blue: Math.round(vals[2][i]*255) };
    };

    // Build undo+apply correction function for a single LED color
    const oldWbVal = oldWb ?? 128, newWbVal = wb ?? 128;
    const oldTintVal = oldTint ?? 128, newTintVal = tint ?? 128;
    const oldSatVal = oldSat ?? 100, newSatVal = sat ?? 100;

    // WB multipliers: R and B channels
    const oldWbR = oldWbVal < 128 ? oldWbVal * 2 : 255;
    const oldWbB = oldWbVal > 128 ? (255 - oldWbVal) * 2 : 255;
    const newWbR = newWbVal < 128 ? newWbVal * 2 : 255;
    const newWbB = newWbVal > 128 ? (255 - newWbVal) * 2 : 255;
    // Tint multipliers: G channel (and R+B for green side)
    const oldTintG  = oldTintVal > 128 ? (255 - oldTintVal) * 2 : 255;
    const oldTintRB = oldTintVal < 128 ? oldTintVal * 2 : 255;
    const newTintG  = newTintVal > 128 ? (255 - newTintVal) * 2 : 255;
    const newTintRB = newTintVal < 128 ? newTintVal * 2 : 255;

    const applyCorrection = c => {
      // Step 1: undo old saturation (in HSV)
      let { red, green, blue } = c;
      if (oldSatVal < 100) {
        const [h, s, v] = rgbToHsv(red, green, blue);
        const sUndone = oldSatVal > 0 ? Math.min(100, s * 100 / oldSatVal) : s;
        ({ red, green, blue } = hsvToRgb(h, sUndone, v));
      }
      // Step 2: undo old tint
      red   = oldTintRB > 0 ? Math.min(255, Math.round(red   * 255 / oldTintRB)) : red;
      green = oldTintG  > 0 ? Math.min(255, Math.round(green * 255 / oldTintG))  : green;
      blue  = oldTintRB > 0 ? Math.min(255, Math.round(blue  * 255 / oldTintRB)) : blue;
      // Step 3: undo old WB
      red   = oldWbR > 0 ? Math.min(255, Math.round(red  * 255 / oldWbR)) : red;
      blue  = oldWbB > 0 ? Math.min(255, Math.round(blue * 255 / oldWbB)) : blue;
      // Step 4: apply new WB
      red   = Math.round(red  * newWbR / 255);
      blue  = Math.round(blue * newWbB / 255);
      // Step 5: apply new tint
      red   = Math.round(red   * newTintRB / 255);
      green = Math.round(green * newTintG  / 255);
      blue  = Math.round(blue  * newTintRB / 255);
      // Step 6: apply new saturation (in HSV)
      if (newSatVal < 100) {
        const [h, s, v] = rgbToHsv(red, green, blue);
        ({ red, green, blue } = hsvToRgb(h, s * newSatVal / 100, v));
      }
      return { red, green, blue };
    };

    // Determine LED range (full device, or just a zone)
    let startIndex = 0;
    let endIndex = target.colors.length;
    if (zoneName) {
      const zoneIndex = (target.zones ?? []).findIndex(z => z.name === zoneName);
      if (zoneIndex >= 0) {
        for (let i = 0; i < zoneIndex; i++) startIndex += target.zones[i].ledsCount;
        endIndex = startIndex + target.zones[zoneIndex].ledsCount;
      }
    }

    const original = [...target.colors];
    const corrected = original.map((c, i) => i >= startIndex && i < endIndex ? applyCorrection(c) : c);

    await client.updateLeds(target.deviceId, corrected);
    await new Promise(r => setTimeout(r, 3000));
    await client.updateLeds(target.deviceId, original);

    try { client.disconnect(); } catch (_) {}

    return { ok: true };
  }
}

new OpenRgbUiServer();
