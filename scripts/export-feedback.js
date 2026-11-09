import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
const db=new DatabaseSync(resolve(process.env.DATA_DIR || './data','savage.sqlite'),{readOnly:true});
try {process.stdout.write(JSON.stringify(db.prepare('SELECT id,created_at,liked,fixes,missing FROM feedback ORDER BY id').all(),null,2)+'\n');}
finally {db.close();}
