const express = require('express');
const { v4: uuid } = require('uuid');
const db = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const csv = require('csv-parse/sync');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// ─── Categorization engine ────────────────────────────────────────────────────

const CATEGORIES = {
  electronics: {
    label: 'Electronics',
    keywords: ['resistor','capacitor','inductor','transistor','mosfet','diode','led','ic ','chip',
      'arduino','esp32','esp8266','raspberry pi','microcontroller','mcu','sensor','module',
      'relay','servo','motor','stepper','driver','pcb','breadboard','oscilloscope','multimeter',
      'soldering','solder','flux','heat shrink','wire','cable','connector','terminal','jumper',
      'battery','lithium','lipo','18650','voltage','regulator','power supply','amp meter',
      'lcd screen','oled','display','flex cable','replacement part','repair tool','circuit',
      'raspberry','stm32','atmega','microchip','fpga','dac','adc','pwm']
  },
  tools: {
    label: 'Tools',
    keywords: ['screwdriver','drill','caliper','wrench','plier','cutter','stripper','clamp',
      'multimeter','oscilloscope','soldering iron','heat gun','crimper','saw','mill','lathe',
      'sander','grinder','precision set','tool kit','repair kit','bit set','hex key','torque',
      'ruler','square','level','micrometer','magnifier','helping hands','bench vise']
  },
  filament: {
    label: '3D Printing',
    keywords: ['filament','pla','abs','petg','tpu','asa','nylon','resin','3d print',
      'spool','nozzle','bed adhesive','kapton','buildtak','glass bed','extruder','hotend',
      'bowden','ptfe','print bed','layer','slicing','creality','prusa','ender']
  },
  hardware: {
    label: 'Hardware / Fasteners',
    keywords: ['screw','bolt','nut','washer','standoff','spacer','rivet','m2','m3','m4','m5',
      'threaded insert','heat insert','brass insert','wood screw','machine screw','hex bolt',
      'spring','hinge','bracket','aluminum','aluminium','steel','acrylic','plywood','sheet metal']
  },
  power: {
    label: 'Power & Batteries',
    keywords: ['power bank','battery charger','solar panel','ups','ac adapter','dc adapter',
      'wall adapter','power supply','12v','24v','5v','voltage converter','buck converter',
      'boost converter','echo dot','alexa','smart plug','raspberry']
  },
  audio_video: {
    label: 'Audio / Video',
    keywords: ['microphone','speaker','amplifier','audio','camera','webcam','capture card',
      'hdmi','usb hub','keyboard','mouse','monitor','headphone','earbuds']
  },
  maker_misc: {
    label: 'Maker Misc',
    keywords: ['lego','craft','glue gun','epoxy','resin','paint','primer','tape','velcro',
      'zip tie','cable tie','cable sleeve','shrink tube','foam','rubber','silicone mat',
      'digital voice recorder','voice recorder','power bank']
  }
};

const JUNK_PATTERNS = [
  /\bnail\b/i, /toothbrush/i, /brita/i, /appetite/i, /weight gain/i,
  /hair (treatment|removal|mask|growth)/i, /epilator/i, /earplug/i,
  /necklace/i, /jewelry/i, /bracelet/i, /ring\b(?!.*(terminal|connector))/i,
  /mud mask/i, /clay mask/i, /cleanser/i, /skincare/i, /moisturizer/i,
  /posture corrector/i, /thermal underwear/i, /underwear/i,
  /funko pop/i, /rolling paper/i, /smokebuddy/i, /grinder\b(?!.*(cnc|metal|angle))/i,
  /air fryer/i, /airbed/i, /mattress/i, /blanket/i, /pillow/i,
  /audible/i, /gratitude journal/i, /life lessons/i, /kindle/i,
  /espn\b/i, /youtube\b/i, /netflix/i, /hulu/i,
  /amazon gift card/i, /metro.*bundle/i, /phone case/i, /silicone case/i,
  /screen protector/i, /card holder.*phone/i, /pipe screen/i,
  /water bottle/i, /thermos/i, /air fryer/i, /food/i, /vitamin/i,
  /supplement/i, /protein/i, /game.*playstation/i, /game.*xbox/i, /game.*nintendo/i,
  /spyro/i, /minecraft/i, /kindle book/i, /ebook/i,
  /face wash/i, /shampoo/i, /conditioner/i, /lotion/i, /deodorant/i
];

function classifyItem(name) {
  const lower = name.toLowerCase();

  // First check if it's obvious junk
  const isJunk = JUNK_PATTERNS.some(p => p.test(lower));
  
  // Check maker categories
  let matchedCategory = null;
  let matchedKeyword = null;
  for (const [cat, { keywords }] of Object.entries(CATEGORIES)) {
    const hit = keywords.find(k => lower.includes(k));
    if (hit) { matchedCategory = cat; matchedKeyword = hit; break; }
  }

  if (isJunk && !matchedCategory) return { verdict: 'skip', category: 'other', confidence: 'high' };
  if (isJunk && matchedCategory) return { verdict: 'review', category: matchedCategory, confidence: 'low', keyword: matchedKeyword };
  if (matchedCategory) return { verdict: 'keep', category: matchedCategory, confidence: 'high', keyword: matchedKeyword };
  return { verdict: 'skip', category: 'other', confidence: 'medium' };
}

// Normalize column names — Amazon uses different names in different export versions
function getField(row, ...candidates) {
  for (const k of candidates) {
    if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
    // case-insensitive fallback
    const found = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
    if (found && row[found] !== undefined && row[found] !== '') return row[found];
  }
  return '';
}

// Parse Amazon CSV (the format from amazon.com/gp/b2b/reports)
function parseAmazonCSV(buffer) {
  const text = buffer.toString('utf8');

  // Try comma first, fall back to tab
  let records;
  for (const delimiter of [',', '\t', ';']) {
    try {
      records = csv.parse(text, {
        columns: true, skip_empty_lines: true,
        relax_column_count: true, trim: true,
        delimiter, bom: true
      });
      if (records.length > 0) break;
    } catch (e) { /* try next */ }
  }
  if (!records || records.length === 0) throw new Error('Could not parse CSV — make sure it is a valid Amazon order export');

  // Debug: log first row keys so we can see what columns exist
  console.log('[import] Amazon CSV columns:', Object.keys(records[0] || {}).join(', '));
  console.log('[import] Row count:', records.length);

  const items = [];
  for (const row of records) {
    // Skip footer rows (excel formulas)
    const orderId = getField(row, 'order id', 'Order ID', 'order_id', 'OrderId');
    if (!orderId || orderId.startsWith('=') || orderId.startsWith('SUBTOTAL')) continue;

    // Amazon B2B report uses "items"; other exports use "product name", "title", etc.
    const itemsRaw = getField(row, 'items', 'Items', 'product name', 'Product Name', 'title', 'Title', 'item', 'Item', 'description', 'Description', 'product', 'Product');
    if (!itemsRaw) continue;

    const date = getField(row, 'date', 'Date', 'order date', 'Order Date', 'purchase date', 'Purchase Date');
    const total = parseFloat(getField(row, 'total', 'Total', 'order total', 'Order Total', 'item total', 'Item Total') || '0') || 0;
    const orderUrl = getField(row, 'order url', 'Order URL', 'order_url');

    // Items column can have multiple items separated by "; "
    // Also handle "|" separator used in some Amazon exports
    let splitItems;
    if (itemsRaw.includes(';')) {
      splitItems = itemsRaw.split(';').map(s => s.trim()).filter(s => s.length > 3);
    } else if (itemsRaw.includes('|')) {
      splitItems = itemsRaw.split('|').map(s => s.trim()).filter(s => s.length > 3);
    } else {
      splitItems = [itemsRaw.trim()].filter(s => s.length > 3);
    }

    const costPerItem = splitItems.length > 0 ? total / splitItems.length : 0;

    for (const itemName of splitItems) {
      if (itemName.startsWith('=') || itemName.startsWith('SUBTOTAL')) continue;
      const classification = classifyItem(itemName);
      items.push({
        _tmpId: uuid(),
        name: itemName.substring(0, 200),
        source: 'amazon',
        order_id: orderId,
        order_date: date,
        order_url: orderUrl,
        price_paid: parseFloat(costPerItem.toFixed(2)),
        category: classification.category,
        verdict: classification.verdict,
        confidence: classification.confidence,
        matched_keyword: classification.keyword || null,
        unit: 'pcs',
        stock_qty: 1
      });
    }
  }

  console.log('[import] Items parsed:', items.length, '| keep:', items.filter(i=>i.verdict==='keep').length, '| skip:', items.filter(i=>i.verdict==='skip').length);
  return items;
}

// Parse DigiKey / Mouser / LCSC style (all pretty clean)
function parseElectronicsCSV(buffer, source) {
  const text = buffer.toString('utf8');
  let records;
  try {
    records = csv.parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true, trim: true });
  } catch (e) {
    throw new Error('Could not parse CSV: ' + e.message);
  }

  return records.filter(r => {
    const name = r['Description'] || r['description'] || r['Customer Reference'] || r['Product Description'] || '';
    return name.length > 0;
  }).map(row => {
    const name = row['Description'] || row['description'] || row['Product Description'] || row['Customer Reference'] || '';
    const qty = parseInt(row['Quantity'] || row['quantity'] || row['QTY'] || '1') || 1;
    const price = parseFloat(row['Unit Price'] || row['unit price'] || row['Price'] || '0') || 0;
    const sku = row['Part Number'] || row['SKU'] || row['LCSC Part #'] || row['Mfr. Part #'] || '';
    const date = row['Order Date'] || row['Date'] || '';

    return {
      _tmpId: uuid(),
      name: name.substring(0, 200),
      description: sku,
      source,
      order_date: date,
      price_paid: price,
      category: 'electronics',
      verdict: 'keep',
      confidence: 'high',
      unit: 'pcs',
      stock_qty: qty
    };
  });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/inventory — list all parts with committed qty
router.get('/', auth, (req, res) => {
  const { search, category } = req.query;
  let query = 'SELECT * FROM inventory_parts WHERE user_id=?';
  const params = [req.user.id];
  if (search) { query += ' AND name LIKE ?'; params.push(`%${search}%`); }
  if (category) { query += ' AND category=?'; params.push(category); }
  query += ' ORDER BY name';

  const parts = db.prepare(query).all(...params);
  const result = parts.map(part => {
    const committed = db.prepare(`
      SELECT COALESCE(SUM(b.qty),0) as total
      FROM bom_items b JOIN projects p ON b.project_id=p.id
      WHERE b.part_id=? AND p.user_id=? AND p.status != 'complete'
    `).get(part.id, req.user.id);
    return { ...part, committed_qty: committed.total, available_qty: part.stock_qty - committed.total };
  });
  res.json(result);
});

// POST /api/inventory/import/preview — parse CSV, return classified items WITHOUT saving
router.post('/import/preview', auth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const source = req.body.source || 'amazon';

  let items;
  try {
    if (source === 'amazon') {
      items = parseAmazonCSV(req.file.buffer);
    } else if (['digikey','mouser','lcsc','aliexpress'].includes(source)) {
      items = parseElectronicsCSV(req.file.buffer, source);
    } else {
      return res.status(400).json({ error: 'Unknown source: ' + source });
    }
  } catch (e) {
    console.error('[import] Parse error:', e.message);
    return res.status(422).json({ error: e.message });
  }

  if (items.length === 0) {
    return res.status(422).json({ error: 'No items found in this CSV. Make sure you selected the right platform and exported the correct report type (Items report for Amazon).' });
  }

  // Stats
  const stats = {
    total: items.length,
    keep: items.filter(i => i.verdict === 'keep').length,
    review: items.filter(i => i.verdict === 'review').length,
    skip: items.filter(i => i.verdict === 'skip').length
  };

  res.json({ items, stats });
});

// POST /api/inventory/import/confirm — save reviewed items
router.post('/import/confirm', auth, (req, res) => {
  const { items } = req.body; // array of items with verdict overrides applied
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'No items' });

  const insert = db.prepare(`
    INSERT OR IGNORE INTO inventory_parts
      (id, user_id, name, description, unit, stock_qty, unit_cost, supplier, supplier_url,
       is_3d_printed, filament_type, filament_grams, filament_cost_per_kg,
       source, order_date, order_id, category, subcategory, import_status)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);

  const insertMany = db.transaction((rows) => {
    let saved = 0;
    for (const item of rows) {
      if (item.verdict === 'skip') continue;
      insert.run(
        uuid(), req.user.id,
        item.name || 'Unnamed',
        item.description || item.matched_keyword || '',
        item.unit || 'pcs',
        item.stock_qty || 1,
        item.price_paid || 0,
        item.source || 'amazon',
        item.order_url || '',
        0, '', 0, 0,
        item.source || 'manual',
        item.order_date || null,
        item.order_id || null,
        item.category || 'other',
        item.subcategory || null,
        'confirmed'
      );
      saved++;
    }
    return saved;
  });

  const saved = insertMany(items);
  res.json({ ok: true, saved });
});

// POST /api/inventory — manual add single part
router.post('/', auth, (req, res) => {
  const { name, description, unit, stock_qty, unit_cost, supplier, supplier_url,
    is_3d_printed, filament_type, filament_grams, filament_cost_per_kg, category, subcategory } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = uuid();
  db.prepare(`INSERT INTO inventory_parts
    (id,user_id,name,description,unit,stock_qty,unit_cost,supplier,supplier_url,
     is_3d_printed,filament_type,filament_grams,filament_cost_per_kg,category,subcategory,source)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id, req.user.id, name, description||'', unit||'pcs', stock_qty||0, unit_cost||0,
      supplier||'', supplier_url||'', is_3d_printed?1:0, filament_type||'',
      filament_grams||0, filament_cost_per_kg||0, category||'other', subcategory||'', 'manual');
  res.json(db.prepare('SELECT * FROM inventory_parts WHERE id=?').get(id));
});

router.put('/:id', auth, (req, res) => {
  const part = db.prepare('SELECT * FROM inventory_parts WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!part) return res.status(404).json({ error: 'Not found' });
  const { name, description, unit, stock_qty, unit_cost, supplier, supplier_url, category, subcategory } = req.body;
  db.prepare(`UPDATE inventory_parts SET
    name=COALESCE(?,name), description=COALESCE(?,description),
    unit=COALESCE(?,unit), stock_qty=COALESCE(?,stock_qty), unit_cost=COALESCE(?,unit_cost),
    supplier=COALESCE(?,supplier), supplier_url=COALESCE(?,supplier_url),
    category=COALESCE(?,category), subcategory=COALESCE(?,subcategory)
    WHERE id=?`)
    .run(name,description,unit,stock_qty,unit_cost,supplier,supplier_url,category,subcategory,req.params.id);
  res.json(db.prepare('SELECT * FROM inventory_parts WHERE id=?').get(req.params.id));
});

router.delete('/:id', auth, (req, res) => {
  db.prepare('DELETE FROM inventory_parts WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
