/**
 * Update Images Script
 * Cập nhật avatar cho các chef và ảnh cho các món ăn với link ảnh thực tế
 * Chạy: node src/scripts/updateImages.js
 */

import { connectToDatabase } from '../config/database.js';
import { ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Avatar links cho các chef (link ảnh thực tế)
const CHEF_AVATARS = {
  'Chef Minh': 'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=400&h=400&fit=crop',
  'Bếp Nhà': 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=400&h=400&fit=crop',
  'Healthy Kitchen': 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop',
  'Healthy Chicken': 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=400&fit=crop', // Fallback nếu tên khác
};

// Mapping tên món ăn với link ảnh thực tế (có thể có nhiều ảnh)
const RECIPE_IMAGES = {
  'Phở Bò Hà Nội': [
    'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800',
    'https://images.unsplash.com/photo-1526318896980-cf78c088247c?w=800',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
  ],
  'Bánh Mì Thịt Nướng': [
    'https://images.unsplash.com/photo-1600688640154-9619e002df30?w=800',
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800',
    'https://images.unsplash.com/photo-1572441713132-51c75654db73?w=800',
  ],
  'Gỏi Cuốn Tôm Thịt': [
    'https://images.unsplash.com/photo-1562967916-eb82221dfb44?w=800',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
  ],
  'Bún Chả Hà Nội': [
    'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
  ],
  'Cơm Tấm Sườn Bì Chả': [
    'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
  ],
  'Pasta Carbonara': [
    'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
    'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=800',
    'https://images.unsplash.com/photo-1598866594230-a7c12756260f?w=800',
  ],
  'Smoothie Bowl Tropical': [
    'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800',
    'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800',
    'https://images.unsplash.com/photo-1553530666-5bf5f32d55f5?w=800',
  ],
  'Sushi Cá Hồi': [
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800',
    'https://images.unsplash.com/photo-1611143669189-44c4c0e0a5c5?w=800',
    'https://images.unsplash.com/photo-1579584425555-c3ce17fd4351?w=800',
  ],
  'Bánh Xèo Miền Tây': [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
  ],
  'Cháo Lòng': [
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
  ],
  'Bún Riêu Cua': [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
  ],
  'Bánh Canh Cua': [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
  ],
  'Bánh Cuốn Nóng': [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
  ],
  'Bún Bò Huế': [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
  ],
  'Cơm Gà Hội An': [
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
  ],
  'Bánh Mì Pate': [
    'https://images.unsplash.com/photo-1600688640154-9619e002df30?w=800',
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800',
  ],
  'Chè Đậu Xanh': [
    'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800',
    'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800',
  ],
  'Bánh Flan Caramel': [
    'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800',
    'https://images.unsplash.com/photo-1553530666-5bf5f32d55f5?w=800',
  ],
  'Pizza Margherita': [
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=800',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
    'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=800',
  ],
  'Pad Thai': [
    'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
  ],
  'Ramen Miso': [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
  ],
  'Tôm Rang Me': [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
  ],
  'Cá Kho Tộ': [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
  ],
  'Canh Chua Cá Lóc': [
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
  ],
  'Bò Kho': [
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=800',
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800',
  ],
  'Chè Thái': [
    'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800',
    'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=800',
    'https://images.unsplash.com/photo-1553530666-5bf5f32d55f5?w=800',
  ],
  'Bánh Mì Chảo': [
    'https://images.unsplash.com/photo-1600688640154-9619e002df30?w=800',
    'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=800',
  ],
};

async function updateImages() {
  console.log('🖼️  Starting to update images...\n');

  try {
    const { db } = await connectToDatabase();

    // 1. Cập nhật avatar cho các chef
    console.log('👨‍🍳 Updating chef avatars...');
    let chefUpdated = 0;
    
    for (const [chefName, avatarUrl] of Object.entries(CHEF_AVATARS)) {
      // Tìm chef theo tên (case insensitive)
      const result = await db.collection('users').updateMany(
        { 
          name: { $regex: new RegExp(`^${chefName}$`, 'i') },
          role: 'chef'
        },
        { 
          $set: { 
            avatar: avatarUrl,
            updatedAt: new Date()
          } 
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`   ✅ Updated avatar for "${chefName}": ${result.modifiedCount} chef(s)`);
        chefUpdated += result.modifiedCount;
      } else {
        // Thử tìm với tên khác (ví dụ: Healthy Kitchen vs Healthy Chicken)
        if (chefName === 'Healthy Kitchen') {
          const result2 = await db.collection('users').updateMany(
            { 
              name: { $regex: /healthy/i },
              role: 'chef'
            },
            { 
              $set: { 
                avatar: avatarUrl,
                updatedAt: new Date()
              } 
            }
          );
          if (result2.modifiedCount > 0) {
            console.log(`   ✅ Updated avatar for chef matching "Healthy": ${result2.modifiedCount} chef(s)`);
            chefUpdated += result2.modifiedCount;
          }
        }
      }
    }

    console.log(`\n   ✅ Total chefs updated: ${chefUpdated}\n`);

    // 2. Cập nhật ảnh cho các món ăn
    console.log('🍳 Updating recipe images...');
    let recipeUpdated = 0;
    let recipeNotFound = [];

    // Lấy tất cả recipes từ database
    const allRecipes = await db.collection('recipes').find({}).toArray();
    console.log(`   Found ${allRecipes.length} recipes in database\n`);

    for (const recipe of allRecipes) {
      const recipeName = recipe.name;
      const imageUrls = RECIPE_IMAGES[recipeName];

      if (imageUrls && imageUrls.length > 0) {
        // Cập nhật với nhiều ảnh
        const updateData = {
          images: imageUrls,
          image: imageUrls[0], // Ảnh đầu tiên làm ảnh chính (backward compatible)
          updatedAt: new Date()
        };

        const result = await db.collection('recipes').updateOne(
          { _id: recipe._id },
          { $set: updateData }
        );

        if (result.modifiedCount > 0) {
          console.log(`   ✅ Updated "${recipeName}": ${imageUrls.length} image(s)`);
          recipeUpdated++;
        }
      } else {
        recipeNotFound.push(recipeName);
      }
    }

    console.log(`\n   ✅ Total recipes updated: ${recipeUpdated}`);
    
    if (recipeNotFound.length > 0) {
      console.log(`\n   ⚠️  Recipes not found in mapping (${recipeNotFound.length}):`);
      recipeNotFound.slice(0, 10).forEach(name => {
        console.log(`      - ${name}`);
      });
      if (recipeNotFound.length > 10) {
        console.log(`      ... and ${recipeNotFound.length - 10} more`);
      }
    }

    console.log('\n🎉 Image update completed!');
    console.log('\n📊 Summary:');
    console.log(`   - Chefs updated: ${chefUpdated}`);
    console.log(`   - Recipes updated: ${recipeUpdated}`);
    console.log(`   - Recipes not found: ${recipeNotFound.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating images:', error);
    process.exit(1);
  }
}

updateImages();

