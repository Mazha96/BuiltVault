// A project that was already 'complete' before the deducted_qty column existed had its BOM parts
// taken out of inventory by the old code. Reopening it must give those parts back.
const { test } = require('node:test');
const assert = require('node:assert');
const { app, db, request, as } = require('./setup');

test('reopening a project completed before the deducted_qty migration returns its parts', async () => {
  await request(app).get('/api/users/me').set(as('final_led')); // creates the user
  db.exec(`
    INSERT INTO projects (id,user_id,title,status) VALUES ('fl_p','user_final_led','Old build','complete');
    INSERT INTO inventory_parts (id,user_id,name,stock_qty) VALUES ('fl_i','user_final_led','ESP32',3);
    INSERT INTO bom_items (id,project_id,part_id,name,qty) VALUES ('fl_b','fl_p','fl_i','ESP32',2);
  `); // state as left by the old code: 5 in stock, 2 deducted on completion, deducted_qty defaulted to 0
  const r = await request(app).put('/api/projects/fl_p').set(as('final_led')).send({ status: 'in_progress' });
  assert.equal(r.status, 200);
  assert.equal(db.prepare("SELECT stock_qty FROM inventory_parts WHERE id='fl_i'").get().stock_qty, 5);
});
