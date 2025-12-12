/**
 * Add More Recipes Script
 * Thêm 20 món ăn mới vào database
 * Chạy: node src/scripts/addMoreRecipes.js
 */

import { connectToDatabase } from '../config/database.js';
import { ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// 20 món ăn mới
const NEW_RECIPES = [
  {
    name: 'Bánh Xèo Miền Tây',
    description: 'Bánh xèo giòn tan với nhân tôm thịt, đậu xanh và rau sống, chấm nước mắm chua ngọt.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 30,
    cookTime: 20,
    servings: 4,
    difficulty: 'Trung bình',
    ingredients: [
      '200g bột gạo',
      '100g bột nghệ',
      '300ml nước cốt dừa',
      '200g tôm sú',
      '200g thịt ba chỉ',
      '100g đậu xanh',
      '100g giá đỗ',
      'Rau xà lách, rau thơm',
      'Nước mắm, đường, chanh, ớt',
    ],
    instructions: [
      'Pha bột: trộn bột gạo, bột nghệ với nước cốt dừa và nước lọc.',
      'Ướp tôm và thịt với hành tím, tỏi, nước mắm.',
      'Ngâm đậu xanh qua đêm, luộc chín mềm.',
      'Đun nóng chảo, cho dầu ăn, đổ bột vào.',
      'Xếp tôm, thịt, đậu xanh, giá đỗ lên một nửa bánh.',
      'Gấp bánh lại, chiên cho đến khi vàng giòn.',
      'Pha nước mắm chua ngọt: nước mắm, đường, chanh, ớt.',
      'Ăn kèm với rau sống và nước mắm.',
    ],
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    tags: ['bánh xèo', 'miền tây', 'giòn', 'tôm thịt'],
  },
  {
    name: 'Cháo Lòng',
    description: 'Cháo lòng nóng hổi với lòng non, dồi, tim gan heo, thơm ngon đậm đà.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 20,
    cookTime: 60,
    servings: 4,
    difficulty: 'Trung bình',
    ingredients: [
      '200g gạo tẻ',
      '500g lòng heo (non, già, dồi)',
      '200g tim gan heo',
      'Hành lá, rau mùi',
      'Hành phi, tiêu',
      'Nước mắm, muối, bột ngọt',
    ],
    instructions: [
      'Rửa sạch lòng heo, luộc sơ qua nước sôi.',
      'Nấu cháo: vo gạo, nấu với nước luộc lòng.',
      'Thái lòng thành miếng vừa ăn.',
      'Cho lòng vào cháo, nêm nếm vừa ăn.',
      'Thái hành lá, rau mùi.',
      'Múc cháo ra tô, xếp lòng lên trên.',
      'Rắc hành phi, tiêu, hành lá, rau mùi.',
    ],
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
    tags: ['cháo lòng', 'lòng heo', 'nóng hổi', 'đậm đà'],
  },
  {
    name: 'Bún Riêu Cua',
    description: 'Bún riêu cua với nước dùng chua ngọt, cà chua, đậu phụ chiên và riêu cua thơm lừng.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 40,
    cookTime: 45,
    servings: 4,
    difficulty: 'Trung bình',
    ingredients: [
      '500g cua đồng',
      '500g bún tươi',
      '200g thịt heo xay',
      '2 quả cà chua',
      '2 miếng đậu phụ',
      '100g hành tây',
      'Hành lá, rau mùi',
      'Nước mắm, muối, đường, me',
    ],
    instructions: [
      'Giã cua, lọc lấy nước cua và gạch cua.',
      'Trộn thịt xay với gạch cua, nêm gia vị.',
      'Nấu nước dùng: cho nước cua vào nồi, đun sôi.',
      'Thả riêu cua vào, đợi riêu nổi lên.',
      'Xào cà chua với hành tây, cho vào nồi.',
      'Chiên đậu phụ vàng, thái miếng.',
      'Nêm nếm nước dùng với nước mắm, muối, đường, me.',
      'Bày bún ra tô, chan nước dùng, xếp riêu, đậu phụ, rau.',
    ],
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    tags: ['bún riêu', 'cua đồng', 'chua ngọt', 'riêu cua'],
  },
  {
    name: 'Bánh Canh Cua',
    description: 'Bánh canh cua với sợi bánh canh dai dai, nước dùng đậm đà và cua tươi ngon.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 30,
    cookTime: 40,
    servings: 4,
    difficulty: 'Trung bình',
    ingredients: [
      '500g cua biển',
      '400g bánh canh',
      '200g thịt heo xay',
      '2 quả trứng gà',
      'Hành lá, rau mùi',
      'Hành phi',
      'Nước mắm, muối, đường, bột ngọt',
    ],
    instructions: [
      'Luộc cua, gỡ thịt cua.',
      'Nấu nước dùng từ xương cua và nước luộc.',
      'Trộn thịt xay với trứng, nêm gia vị, vo viên.',
      'Cho viên thịt vào nước dùng, đun sôi.',
      'Nấu bánh canh trong nước dùng.',
      'Nêm nếm vừa ăn.',
      'Bày ra tô, xếp thịt cua, viên thịt lên trên.',
      'Rắc hành lá, rau mùi, hành phi.',
    ],
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    tags: ['bánh canh', 'cua biển', 'đậm đà', 'nước dùng'],
  },
  {
    name: 'Bánh Cuốn Nóng',
    description: 'Bánh cuốn nóng mềm mịn với nhân thịt xay, mộc nhĩ, nấm hương, chấm nước mắm.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 40,
    cookTime: 30,
    servings: 4,
    difficulty: 'Khó',
    ingredients: [
      '300g bột gạo',
      '200g thịt heo xay',
      '50g mộc nhĩ',
      '50g nấm hương',
      'Hành lá, rau mùi',
      'Hành phi',
      'Nước mắm, đường, chanh, ớt',
    ],
    instructions: [
      'Pha bột: trộn bột gạo với nước, để lắng 2 tiếng.',
      'Xào nhân: xào thịt xay với mộc nhĩ, nấm hương.',
      'Nêm gia vị cho nhân vừa ăn.',
      'Đun nóng chảo chống dính, đổ bột mỏng.',
      'Hấp bánh cho đến khi chín trong.',
      'Xếp nhân lên bánh, cuộn lại.',
      'Pha nước mắm chua ngọt.',
      'Bày ra đĩa, rắc hành phi, ăn kèm rau.',
    ],
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    tags: ['bánh cuốn', 'nóng', 'mềm mịn', 'nhân thịt'],
  },
  {
    name: 'Bún Bò Huế',
    description: 'Bún bò Huế đậm đà với nước dùng cay nồng, thịt bò, giò heo và chả cua.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 60,
    cookTime: 120,
    servings: 6,
    difficulty: 'Khó',
    ingredients: [
      '1kg xương bò',
      '500g thịt bò',
      '500g giò heo',
      '200g chả cua',
      '500g bún tươi',
      'Sả, ớt, tỏi',
      'Hành lá, rau mùi, rau thơm',
      'Nước mắm, muối, đường, bột ngọt',
    ],
    instructions: [
      'Hầm xương bò với nước trong 2 tiếng.',
      'Luộc thịt bò và giò heo chín mềm.',
      'Xào sả, ớt, tỏi với dầu màu điều.',
      'Cho vào nồi nước dùng, nêm nếm.',
      'Thái thịt bò và giò heo thành lát.',
      'Hấp chả cua.',
      'Bày bún ra tô, xếp thịt, chả cua.',
      'Chan nước dùng nóng, rắc rau thơm.',
    ],
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    tags: ['bún bò', 'huế', 'cay nồng', 'đậm đà'],
  },
  {
    name: 'Cơm Gà Hội An',
    description: 'Cơm gà Hội An với gà luộc thơm, cơm vàng nghệ và nước mắm gừng đặc trưng.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 30,
    cookTime: 45,
    servings: 4,
    difficulty: 'Trung bình',
    ingredients: [
      '1 con gà ta (1.2kg)',
      '400g gạo tẻ',
      '100g nghệ tươi',
      'Hành lá, rau mùi',
      'Gừng, tỏi',
      'Nước mắm, muối, đường',
      'Rau sống, đồ chua',
    ],
    instructions: [
      'Luộc gà với gừng, muối cho đến khi chín.',
      'Vo gạo, nấu với nước luộc gà và nghệ.',
      'Xé thịt gà thành miếng vừa ăn.',
      'Pha nước mắm gừng: nước mắm, đường, gừng băm, tỏi.',
      'Bày cơm ra đĩa, xếp thịt gà lên trên.',
      'Rắc hành phi, ăn kèm rau sống và đồ chua.',
      'Chấm với nước mắm gừng.',
    ],
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
    tags: ['cơm gà', 'hội an', 'nghệ', 'gừng'],
  },
  {
    name: 'Bánh Mì Pate',
    description: 'Bánh mì pate truyền thống với pate béo ngậy, thịt nguội, chả lụa và đồ chua.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 15,
    cookTime: 5,
    servings: 2,
    difficulty: 'Dễ',
    ingredients: [
      '2 ổ bánh mì',
      '100g pate',
      '50g thịt nguội',
      '50g chả lụa',
      'Đồ chua (cà rốt, củ cải)',
      'Dưa leo, rau mùi',
      'Mayonnaise, ớt',
    ],
    instructions: [
      'Nướng bánh mì cho giòn.',
      'Phết pate vào bên trong bánh.',
      'Xếp thịt nguội, chả lụa vào.',
      'Thêm đồ chua, dưa leo, rau mùi.',
      'Phết mayonnaise, thêm ớt nếu thích.',
    ],
    image: 'https://images.unsplash.com/photo-1600688640154-9619e002df30?w=800',
    tags: ['bánh mì', 'pate', 'nhanh', 'truyền thống'],
  },
  {
    name: 'Chè Đậu Xanh',
    description: 'Chè đậu xanh mát lạnh, ngọt thanh với nước cốt dừa và đá bào.',
    category: 'dessert',
    cuisine: 'vietnamese',
    prepTime: 20,
    cookTime: 30,
    servings: 4,
    difficulty: 'Dễ',
    ingredients: [
      '200g đậu xanh',
      '100g đường phèn',
      '200ml nước cốt dừa',
      'Lá dứa',
      'Đá bào',
    ],
    instructions: [
      'Ngâm đậu xanh qua đêm, đãi vỏ.',
      'Nấu đậu với nước và lá dứa cho đến khi mềm.',
      'Thêm đường phèn, nấu tan.',
      'Để nguội, cho vào tủ lạnh.',
      'Khi ăn, múc ra cốc, thêm nước cốt dừa và đá bào.',
    ],
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800',
    tags: ['chè', 'đậu xanh', 'mát lạnh', 'tráng miệng'],
  },
  {
    name: 'Bánh Flan Caramel',
    description: 'Bánh flan mềm mịn với lớp caramel ngọt ngào, thơm mùi vani.',
    category: 'dessert',
    cuisine: 'western',
    prepTime: 15,
    cookTime: 45,
    servings: 6,
    difficulty: 'Trung bình',
    ingredients: [
      '6 quả trứng gà',
      '500ml sữa tươi',
      '100g đường',
      '1 ống vani',
      'Nước cốt chanh',
    ],
    instructions: [
      'Làm caramel: đun đường với nước cho đến khi vàng.',
      'Đổ caramel vào khuôn bánh.',
      'Đánh trứng với sữa, vani, đường.',
      'Lọc hỗn hợp qua rây.',
      'Đổ vào khuôn đã có caramel.',
      'Hấp cách thủy trong 30-40 phút.',
      'Để nguội, cho vào tủ lạnh 2 tiếng.',
      'Lật ngược khuôn ra đĩa khi ăn.',
    ],
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800',
    tags: ['bánh flan', 'caramel', 'tráng miệng', 'mềm mịn'],
  },
  {
    name: 'Pizza Margherita',
    description: 'Pizza Margherita Ý cổ điển với phô mai mozzarella, cà chua tươi và lá basil.',
    category: 'western',
    cuisine: 'italian',
    prepTime: 60,
    cookTime: 15,
    servings: 2,
    difficulty: 'Trung bình',
    ingredients: [
      '300g bột mì',
      '200ml nước ấm',
      '5g men nở',
      '200g phô mai mozzarella',
      '200g cà chua',
      'Lá basil tươi',
      'Dầu olive, muối, đường',
    ],
    instructions: [
      'Nhào bột: trộn bột, men, nước, muối, dầu olive.',
      'Ủ bột 1 tiếng cho nở.',
      'Làm sốt cà chua: xay cà chua, nấu với muối, đường.',
      'Cán bột thành hình tròn.',
      'Phết sốt cà chua lên bột.',
      'Xếp phô mai mozzarella lên trên.',
      'Nướng ở 250°C trong 10-15 phút.',
      'Rắc lá basil tươi lên khi vừa ra lò.',
    ],
    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
    tags: ['pizza', 'margherita', 'ý', 'phô mai'],
  },
  {
    name: 'Pad Thai',
    description: 'Pad Thai Thái Lan với bún phở, tôm, đậu phụ, trứng và nước sốt chua ngọt.',
    category: 'asian',
    cuisine: 'thai',
    prepTime: 20,
    cookTime: 15,
    servings: 2,
    difficulty: 'Trung bình',
    ingredients: [
      '200g bún phở khô',
      '200g tôm',
      '100g đậu phụ',
      '2 quả trứng',
      '100g giá đỗ',
      'Hành lá, đậu phộng',
      'Nước mắm, đường, me, ớt',
    ],
    instructions: [
      'Ngâm bún phở trong nước ấm cho mềm.',
      'Xào tôm với dầu, để riêng.',
      'Chiên đậu phụ vàng, thái miếng.',
      'Xào trứng, cho bún vào.',
      'Thêm nước sốt pad thai (nước mắm, đường, me).',
      'Cho tôm, đậu phụ, giá đỗ vào.',
      'Trộn đều, nêm nếm vừa ăn.',
      'Bày ra đĩa, rắc đậu phộng, hành lá.',
    ],
    image: 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800',
    tags: ['pad thai', 'thái lan', 'chua ngọt', 'tôm'],
  },
  {
    name: 'Ramen Miso',
    description: 'Ramen miso Nhật Bản với nước dùng miso đậm đà, thịt heo, trứng luộc và rong biển.',
    category: 'asian',
    cuisine: 'japanese',
    prepTime: 30,
    cookTime: 60,
    servings: 2,
    difficulty: 'Khó',
    ingredients: [
      '200g mì ramen',
      '100g thịt heo ba chỉ',
      '2 quả trứng',
      'Rong biển nori',
      'Hành lá, măng chua',
      'Miso paste',
      'Nước dùng dashi',
    ],
    instructions: [
      'Luộc trứng 6 phút, ngâm nước lạnh, bóc vỏ.',
      'Luộc thịt heo với nước dùng dashi.',
      'Nấu nước dùng miso: hòa miso paste với dashi.',
      'Nấu mì ramen theo hướng dẫn.',
      'Thái thịt heo thành lát mỏng.',
      'Bày mì ra tô, chan nước dùng miso.',
      'Xếp thịt heo, trứng, rong biển, măng chua lên trên.',
      'Rắc hành lá, thưởng thức nóng.',
    ],
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    tags: ['ramen', 'miso', 'nhật bản', 'nước dùng'],
  },
  {
    name: 'Tôm Rang Me',
    description: 'Tôm rang me chua ngọt với nước sốt me đậm đà, thơm mùi tỏi và ớt.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 20,
    cookTime: 15,
    servings: 4,
    difficulty: 'Dễ',
    ingredients: [
      '500g tôm sú',
      '50g me chua',
      '3 tép tỏi',
      '2 quả ớt',
      'Hành lá',
      'Nước mắm, đường, muối',
    ],
    instructions: [
      'Rửa sạch tôm, cắt râu, để ráo.',
      'Ngâm me với nước ấm, lọc lấy nước cốt.',
      'Xào tỏi thơm, cho tôm vào.',
      'Thêm nước cốt me, nước mắm, đường.',
      'Nấu cho đến khi tôm chín, nước sốt sệt.',
      'Thêm ớt, hành lá.',
      'Bày ra đĩa, ăn kèm cơm nóng.',
    ],
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    tags: ['tôm rang me', 'chua ngọt', 'đậm đà', 'tôm'],
  },
  {
    name: 'Cá Kho Tộ',
    description: 'Cá kho tộ miền Nam với nước kho đậm đà, thịt cá mềm thấm gia vị.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 15,
    cookTime: 60,
    servings: 4,
    difficulty: 'Trung bình',
    ingredients: [
      '1kg cá tra hoặc cá basa',
      '100g thịt ba chỉ',
      'Nước dừa tươi',
      'Hành tím, tỏi',
      'Nước mắm, đường, muối, tiêu',
      'Ớt hiểm',
    ],
    instructions: [
      'Rửa sạch cá, cắt khúc vừa ăn.',
      'Ướp cá với nước mắm, đường, muối, tiêu.',
      'Xếp cá vào nồi đất, thêm thịt ba chỉ.',
      'Cho nước dừa, hành tím, tỏi, ớt.',
      'Kho với lửa nhỏ trong 1 tiếng.',
      'Lật cá, kho thêm 15 phút cho nước kho sệt.',
      'Bày ra đĩa, ăn kèm cơm nóng và rau sống.',
    ],
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    tags: ['cá kho tộ', 'miền nam', 'đậm đà', 'cá'],
  },
  {
    name: 'Canh Chua Cá Lóc',
    description: 'Canh chua cá lóc miền Tây với vị chua ngọt từ me, cà chua và các loại rau.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 20,
    cookTime: 30,
    servings: 4,
    difficulty: 'Dễ',
    ingredients: [
      '1 con cá lóc (800g)',
      '2 quả cà chua',
      '100g đậu bắp',
      '100g giá đỗ',
      '50g me chua',
      'Hành lá, rau ngổ',
      'Nước mắm, đường, muối',
    ],
    instructions: [
      'Làm sạch cá, cắt khúc.',
      'Ngâm me, lọc lấy nước cốt.',
      'Nấu nước sôi, cho cá vào.',
      'Thêm cà chua, đậu bắp.',
      'Cho nước cốt me, nêm nếm.',
      'Thêm giá đỗ, hành lá, rau ngổ.',
      'Nấu thêm 5 phút, tắt bếp.',
      'Múc ra tô, ăn nóng với cơm.',
    ],
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    tags: ['canh chua', 'cá lóc', 'miền tây', 'chua ngọt'],
  },
  {
    name: 'Bò Kho',
    description: 'Bò kho với thịt bò mềm thấm gia vị, nước dùng đậm đà và bánh mì giòn.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 30,
    cookTime: 120,
    servings: 4,
    difficulty: 'Trung bình',
    ingredients: [
      '1kg thịt bò (bắp hoặc gầu)',
      '2 củ cà rốt',
      '2 củ hành tây',
      'Sả, gừng, tỏi',
      'Hành lá, rau mùi',
      'Nước mắm, muối, đường, bột ngọt',
      'Bánh mì',
    ],
    instructions: [
      'Thái thịt bò thành miếng vừa ăn.',
      'Ướp thịt với sả, gừng, tỏi, nước mắm.',
      'Xào thịt cho săn, thêm nước.',
      'Hầm thịt với lửa nhỏ trong 1.5 tiếng.',
      'Thêm cà rốt, hành tây vào.',
      'Nấu thêm 30 phút cho mềm.',
      'Nêm nếm vừa ăn.',
      'Bày ra tô, rắc hành lá, ăn kèm bánh mì.',
    ],
    image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
    tags: ['bò kho', 'đậm đà', 'mềm', 'bánh mì'],
  },
  {
    name: 'Chè Thái',
    description: 'Chè Thái với nhiều loại trái cây, thạch dừa, nước cốt dừa và đá bào.',
    category: 'dessert',
    cuisine: 'vietnamese',
    prepTime: 30,
    cookTime: 20,
    servings: 4,
    difficulty: 'Dễ',
    ingredients: [
      '100g thạch dừa',
      '100g thạch rau câu',
      'Dừa non, mít, thơm',
      '200ml nước cốt dừa',
      '100g đường',
      'Đá bào',
    ],
    instructions: [
      'Cắt thạch dừa và thạch rau câu thành miếng nhỏ.',
      'Thái dừa non, mít, thơm thành miếng vừa ăn.',
      'Pha nước đường: đun đường với nước cho tan.',
      'Để nguội, cho vào tủ lạnh.',
      'Khi ăn, trộn tất cả nguyên liệu.',
      'Thêm nước cốt dừa và đá bào.',
      'Khuấy đều, thưởng thức mát lạnh.',
    ],
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800',
    tags: ['chè thái', 'trái cây', 'mát lạnh', 'tráng miệng'],
  },
  {
    name: 'Bánh Mì Chảo',
    description: 'Bánh mì chảo với trứng ốp la, pate, thịt nguội, chả lụa và nước sốt đặc biệt.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 10,
    cookTime: 10,
    servings: 1,
    difficulty: 'Dễ',
    ingredients: [
      '1 ổ bánh mì',
      '2 quả trứng',
      '50g pate',
      '50g thịt nguội',
      '50g chả lụa',
      'Dưa leo, rau mùi',
      'Nước sốt đặc biệt',
    ],
    instructions: [
      'Nướng bánh mì cho giòn.',
      'Chiên trứng ốp la.',
      'Phết pate vào bánh.',
      'Xếp trứng, thịt nguội, chả lụa lên.',
      'Thêm dưa leo, rau mùi.',
      'Rưới nước sốt đặc biệt.',
      'Thưởng thức nóng.',
    ],
    image: 'https://images.unsplash.com/photo-1600688640154-9619e002df30?w=800',
    tags: ['bánh mì chảo', 'trứng', 'nhanh', 'sáng'],
  },
];

async function addMoreRecipes() {
  console.log('🍳 Starting to add 20 more recipes...\n');

  try {
    const { db } = await connectToDatabase();

    // Lấy danh sách các user từ database (ưu tiên chef)
    const users = await db.collection('users').find({}).toArray();
    
    if (users.length === 0) {
      console.log('⚠️  No users found. Creating a default user...');
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('password123', 10);
      const result = await db.collection('users').insertOne({
        name: 'Chef Default',
        email: 'chef.default@cookshare.com',
        password: hashedPassword,
        role: 'chef',
        avatar: 'https://i.pravatar.cc/150?img=1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      users.push(await db.collection('users').findOne({ _id: result.insertedId }));
    }

    // Ưu tiên các chef, sau đó mới đến user thường
    const chefs = users.filter(u => u.role === 'chef');
    const regularUsers = users.filter(u => !u.role || u.role === 'user');
    const allUsers = [...chefs, ...regularUsers];

    console.log(`✅ Found ${allUsers.length} users (${chefs.length} chefs, ${regularUsers.length} regular users)\n`);

    // Thêm recipes với author info - phân bổ đều cho các user
    const recipesWithAuthors = NEW_RECIPES.map((recipe, index) => {
      const author = allUsers[index % allUsers.length];
      return {
        ...recipe,
        authorId: author._id,
        authorName: author.name || 'Chef',
        authorAvatar: author.avatar || '',
        images: recipe.image ? [recipe.image] : [],
        videos: [],
        isPublic: true,
        viewCount: Math.floor(Math.random() * 500) + 10,
        likeCount: Math.floor(Math.random() * 100),
        saveCount: Math.floor(Math.random() * 50),
        ratingCount: Math.floor(Math.random() * 30) + 5,
        averageRating: Math.round((Math.random() * 1.5 + 3.5) * 10) / 10, // 3.5 - 5.0
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last 7 days
        updatedAt: new Date(),
      };
    });

    const result = await db.collection('recipes').insertMany(recipesWithAuthors);
    console.log(`✅ Successfully added ${result.insertedCount} recipes!\n`);

    // Hiển thị thống kê theo author
    const authorStats = {};
    recipesWithAuthors.forEach(recipe => {
      const authorName = recipe.authorName;
      if (!authorStats[authorName]) {
        authorStats[authorName] = 0;
      }
      authorStats[authorName]++;
    });

    console.log('📊 Summary:');
    const totalRecipes = await db.collection('recipes').countDocuments();
    console.log(`   - Total recipes in database: ${totalRecipes}`);
    console.log(`   - New recipes added: ${result.insertedCount}\n`);

    console.log('👨‍🍳 Recipes by author:');
    Object.entries(authorStats).forEach(([author, count]) => {
      console.log(`   - ${author}: ${count} recipes`);
    });

    console.log('\n🎉 Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding recipes:', error);
    process.exit(1);
  }
}

addMoreRecipes();

