export const products = [
  { id: 1, name: 'Kasturi Rice 26 kg', price: 830, unit: '26kg', category: 'Rice', emoji: '🌾' },
  { id: 2, name: 'Kasturi Rice 1 kg', price: 35, unit: '1kg', category: 'Rice', emoji: '🌾' },
  { id: 3, name: 'Vardhman Mini Kit 26 kg', price: 1320, unit: '26kg', category: 'Rice', emoji: '🌾' },
  { id: 4, name: 'Fortune Mini Kit 26 kg', price: 1430, unit: '26kg', category: 'Rice', emoji: '🌾' },
  { id: 5, name: 'Fortune Mini Kit 1 kg', price: 58, unit: '1kg', category: 'Rice', emoji: '🌾' },
  { id: 6, name: 'Refined Oil 1 Liter', price: 135, unit: '1L', category: 'Oil', emoji: '🫙' },
  { id: 7, name: 'Mustard Oil 1 Liter', price: 170, unit: '1L', category: 'Oil', emoji: '🫙' },
  { id: 8, name: 'Toor Dal 1 kg', price: 125, unit: '1kg', category: 'Dal', emoji: '🫘' },
  { id: 9, name: 'Dalmia Gold 250 gm', price: 110, unit: '250gm', category: 'Dal', emoji: '🫘' },
  { id: 10, name: 'Sugar 1 kg', price: 48, unit: '1kg', category: 'Atta & Sugar', emoji: '🍬' },
  { id: 11, name: 'Aashirvaad Atta 5 kg', price: 235, unit: '5kg', category: 'Atta & Sugar', emoji: '🌿' },
  { id: 12, name: 'Loose Atta 1 kg', price: 35, unit: '1kg', category: 'Atta & Sugar', emoji: '🌿' },
  { id: 13, name: 'Chana Dal 1 kg', price: 80, unit: '1kg', category: 'Dal', emoji: '🫘' },
  { id: 14, name: 'Kabuli Chana 1 kg', price: 110, unit: '1kg', category: 'Dal', emoji: '🫘' },
  { id: 15, name: 'Atta 26 kg', price: 850, unit: '26kg', category: 'Atta & Sugar', emoji: '🌿' },
]

export const categories = ['All', ...new Set(products.map(p => p.category))]
