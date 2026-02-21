'use strict';

/**
 * Extract Laravel Model specifics from FileFacts.
 */
function extract(sourceText, fileFacts) {
  const laravelContext = { type: 'model', table: null, fillable: [], guarded: [], relationships: [] };

  // $table
  const tableMatch = sourceText.match(/protected\s+\$table\s*=\s*['"]([^'"]+)['"]/);
  if (tableMatch) laravelContext.table = tableMatch[1];

  // $fillable
  const fillableMatch = sourceText.match(/protected\s+\$fillable\s*=\s*\[([^\]]*)\]/s);
  if (fillableMatch) {
    laravelContext.fillable = fillableMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
  }

  // $guarded
  const guardedMatch = sourceText.match(/protected\s+\$guarded\s*=\s*\[([^\]]*)\]/s);
  if (guardedMatch) {
    laravelContext.guarded = guardedMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean);
  }

  // Eloquent relationships
  const relTypes = ['hasOne', 'hasMany', 'belongsTo', 'belongsToMany', 'morphTo', 'morphMany', 'morphOne', 'hasManyThrough', 'hasOneThrough'];
  const relRegex = new RegExp(`return\\s+\\$this->(${relTypes.join('|')})\\s*\\(\\s*([\\w:]+)`, 'g');
  let m;
  for (const fn of fileFacts.functions) {
    const bodyArea = sourceText.slice(Math.max(0, (fn.lineStart - 1) * 40), fn.lineEnd * 80);
    while ((m = relRegex.exec(bodyArea)) !== null) {
      const relatedModel = m[2].replace(/::class$/, '').split('\\').pop();
      laravelContext.relationships.push({ method: fn.name, type: m[1], relatedModel });
    }
    relRegex.lastIndex = 0;
  }

  return laravelContext;
}

module.exports = { extract };
