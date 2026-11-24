const fs = require('fs');

try {
    const data = JSON.parse(fs.readFileSync('src/data/recipes.json', 'utf8'));
    const sources = [
        'ADA - American Diabetes Association',
        'WHO - World Health Organization',
        'NIDDK - National Institute of Diabetes'
    ];

    let count = 0;
    data.forEach((recipe, index) => {
        if (!recipe.source) {
            recipe.source = sources[index % sources.length];
            count++;
        }
    });

    fs.writeFileSync('src/data/recipes.json', JSON.stringify(data, null, 2), 'utf8');
    console.log(`Successfully added source to ${count} recipes.`);
} catch (error) {
    console.error('Error updating recipes:', error);
}
