const pool = require('./src/config/db');
pool.query('SELECT syllabus_json FROM syllabi ORDER BY created_at DESC LIMIT 1').then(res => {
  console.log(res.rows[0].syllabus_json);
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
