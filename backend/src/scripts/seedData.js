/**
 * Seed Data Script
 * Tạo dữ liệu mẫu cho database
 * Chạy: npm run seed
 */

import { connectToDatabase } from '../config/database.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

// Sample recipes data
const SAMPLE_RECIPES = [
  {
    name: 'Phở Bò Hà Nội',
    description: 'Phở bò truyền thống Hà Nội với nước dùng trong vắt, thơm ngọt từ xương bò hầm 12 tiếng.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 30,
    cookTime: 720, // 12 hours
    servings: 6,
    difficulty: 'Khó',
    ingredients: [
      '2kg xương bò',
      '500g thịt bò (nạm, gầu, tái)',
      '1kg bánh phở',
      '2 củ hành tây nướng',
      '100g gừng nướng',
      '5 quả hồi',
      '1 thanh quế',
      '3 quả thảo quả',
      'Hành lá, rau mùi, giá đỗ',
      'Nước mắm, muối, đường phèn',
    ],
    instructions: [
      'Rửa sạch xương bò, chần qua nước sôi để loại bỏ tạp chất.',
      'Hầm xương bò với nước trong 12 tiếng, vớt bọt thường xuyên.',
      'Nướng hành tây và gừng, cho vào nồi nước dùng.',
      'Rang các loại gia vị (hồi, quế, thảo quả) rồi cho vào túi vải, thả vào nồi.',
      'Nêm nếm với nước mắm, muối, đường phèn cho vừa ăn.',
      'Thái thịt bò mỏng, trần bánh phở qua nước sôi.',
      'Bày bánh phở, thịt bò vào tô, chan nước dùng nóng.',
      'Trang trí với hành lá, rau mùi, ăn kèm giá đỗ và chanh.',
    ],
    image: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800',
    tags: ['phở', 'bò', 'hà nội', 'truyền thống', 'nước dùng'],
    viewCount: 1500,
    likeCount: 320,
    saveCount: 180,
    ratingCount: 45,
    averageRating: 4.8,
  },
  {
    name: 'Bánh Mì Thịt Nướng',
    description: 'Bánh mì Việt Nam với thịt nướng thơm lừng, đồ chua giòn tan và các loại rau sống.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 20,
    cookTime: 15,
    servings: 4,
    difficulty: 'Dễ',
    ingredients: [
      '4 ổ bánh mì',
      '400g thịt heo (ba chỉ hoặc nạc vai)',
      '2 thìa sả băm',
      '2 thìa tỏi băm',
      '3 thìa nước mắm',
      '2 thìa đường',
      '1 thìa dầu hào',
      'Đồ chua (cà rốt, củ cải)',
      'Dưa leo, rau mùi, hành lá',
      'Pate, mayonnaise',
    ],
    instructions: [
      'Thái thịt mỏng, ướp với sả, tỏi, nước mắm, đường, dầu hào trong 30 phút.',
      'Làm đồ chua: thái sợi cà rốt và củ cải, ngâm giấm đường.',
      'Nướng thịt trên bếp than hoặc chảo cho đến khi chín vàng.',
      'Nướng bánh mì cho giòn.',
      'Phết pate và mayonnaise vào bánh mì.',
      'Xếp thịt nướng, đồ chua, dưa leo, rau mùi vào bánh.',
      'Rưới thêm nước sốt thịt nướng nếu thích.',
    ],
    image: 'https://images.unsplash.com/photo-1600688640154-9619e002df30?w=800',
    tags: ['bánh mì', 'thịt nướng', 'street food', 'nhanh'],
    viewCount: 980,
    likeCount: 245,
    saveCount: 120,
    ratingCount: 38,
    averageRating: 4.6,
  },
  {
    name: 'Gỏi Cuốn Tôm Thịt',
    description: 'Gỏi cuốn tươi mát với tôm, thịt heo và rau sống, chấm mắm nêm hoặc tương đậu phộng.',
    category: 'healthy',
    cuisine: 'vietnamese',
    prepTime: 30,
    cookTime: 10,
    servings: 4,
    difficulty: 'Dễ',
    ingredients: [
      '200g tôm sú',
      '200g thịt ba chỉ luộc',
      '1 bó bún tươi',
      '1 bó rau xà lách',
      '1 bó rau thơm (húng quế, tía tô)',
      '1 bó hẹ',
      '20 bánh tráng',
      'Đậu phộng rang',
      'Tương đậu phộng hoặc mắm nêm',
    ],
    instructions: [
      'Luộc tôm, bóc vỏ, bổ đôi theo chiều dọc.',
      'Luộc thịt ba chỉ, thái lát mỏng.',
      'Rửa sạch rau, để ráo nước.',
      'Nhúng bánh tráng qua nước ấm cho mềm.',
      'Xếp rau xà lách, bún, thịt, tôm lên bánh tráng.',
      'Cuộn chặt tay, gấp 2 mép lại khi cuộn được nửa.',
      'Pha nước chấm tương đậu phộng hoặc mắm nêm.',
    ],
    image: 'https://images.unsplash.com/photo-1562967916-eb82221dfb44?w=800',
    tags: ['gỏi cuốn', 'healthy', 'tươi mát', 'low carb'],
    viewCount: 756,
    likeCount: 198,
    saveCount: 95,
    ratingCount: 28,
    averageRating: 4.7,
  },
  {
    name: 'Bún Chả Hà Nội',
    description: 'Bún chả đặc trưng Hà Nội với chả viên và chả miếng nướng than, nước chấm chua ngọt.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 40,
    cookTime: 20,
    servings: 4,
    difficulty: 'Trung bình',
    ingredients: [
      '500g thịt heo (nạc vai + ba chỉ)',
      '500g bún tươi',
      '2 thìa hành tím băm',
      '2 thìa tỏi băm',
      '3 thìa nước mắm',
      '2 thìa đường',
      '1 thìa mật ong',
      'Đu đủ xanh, cà rốt ngâm chua',
      'Rau sống, rau thơm',
      'Ớt, tỏi ngâm giấm',
    ],
    instructions: [
      'Thái thịt ba chỉ thành miếng vừa ăn, băm nhuyễn thịt nạc vai.',
      'Ướp thịt với hành tím, tỏi, nước mắm, đường, mật ong trong 2 tiếng.',
      'Vo thịt băm thành viên nhỏ.',
      'Nướng thịt trên bếp than cho đến khi chín vàng, thơm.',
      'Pha nước chấm: nước mắm, đường, giấm, nước lọc theo tỉ lệ 1:1:1:3.',
      'Cho thịt nướng vào bát nước chấm.',
      'Bày bún ra đĩa, ăn kèm rau sống và nước chấm thịt nướng.',
    ],
    image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800',
    tags: ['bún chả', 'hà nội', 'nướng', 'truyền thống'],
    viewCount: 1200,
    likeCount: 285,
    saveCount: 150,
    ratingCount: 42,
    averageRating: 4.9,
  },
  {
    name: 'Cơm Tấm Sườn Bì Chả',
    description: 'Cơm tấm Sài Gòn đặc trưng với sườn nướng, bì, chả trứng và nước mắm pha.',
    category: 'vietnamese',
    cuisine: 'vietnamese',
    prepTime: 30,
    cookTime: 25,
    servings: 4,
    difficulty: 'Trung bình',
    ingredients: [
      '4 miếng sườn heo',
      '200g bì heo',
      '4 quả trứng',
      '100g thịt heo xay',
      '400g gạo tấm',
      'Đồ chua, dưa leo',
      'Hành phi, mỡ hành',
      'Nước mắm, đường, tỏi, ớt',
    ],
    instructions: [
      'Ướp sườn với sả, tỏi, nước mắm, đường, dầu hào trong 2 tiếng.',
      'Nướng sườn trên bếp than cho đến khi chín vàng.',
      'Làm bì: luộc da heo, thái sợi, trộn với thính.',
      'Làm chả trứng: trộn thịt xay với trứng, hấp chín.',
      'Nấu cơm tấm cho dẻo.',
      'Pha nước mắm: nước mắm, đường, nước, tỏi ớt băm.',
      'Bày cơm ra đĩa, xếp sườn, bì, chả, đồ chua, dưa leo.',
      'Rưới mỡ hành, hành phi lên trên.',
    ],
    image: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800',
    tags: ['cơm tấm', 'sài gòn', 'sườn nướng', 'đặc sản'],
    viewCount: 890,
    likeCount: 210,
    saveCount: 98,
    ratingCount: 35,
    averageRating: 4.5,
  },
  {
    name: 'Pasta Carbonara',
    description: 'Pasta Carbonara Ý truyền thống với trứng, phô mai Pecorino và thịt xông khói.',
    category: 'western',
    cuisine: 'italian',
    prepTime: 10,
    cookTime: 15,
    servings: 2,
    difficulty: 'Dễ',
    ingredients: [
      '200g spaghetti',
      '100g guanciale hoặc bacon',
      '2 lòng đỏ trứng + 1 quả trứng nguyên',
      '50g phô mai Pecorino Romano',
      '50g phô mai Parmesan',
      'Tiêu đen xay',
      'Muối',
    ],
    instructions: [
      'Luộc spaghetti trong nước muối theo hướng dẫn trên bao bì.',
      'Cắt guanciale/bacon thành miếng nhỏ, chiên giòn.',
      'Trộn trứng với phô mai bào, thêm tiêu đen.',
      'Khi mì chín, vớt ra và trộn ngay với thịt xông khói.',
      'Tắt bếp, đổ hỗn hợp trứng phô mai vào, trộn nhanh tay.',
      'Thêm một ít nước luộc mì nếu cần để sốt mịn.',
      'Rắc thêm phô mai và tiêu đen lên trên.',
    ],
    image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800',
    tags: ['pasta', 'ý', 'carbonara', 'nhanh'],
    viewCount: 650,
    likeCount: 175,
    saveCount: 88,
    ratingCount: 30,
    averageRating: 4.4,
  },
  {
    name: 'Smoothie Bowl Tropical',
    description: 'Smoothie bowl nhiệt đới với chuối, xoài, thanh long và các loại topping healthy.',
    category: 'healthy',
    cuisine: 'international',
    prepTime: 10,
    cookTime: 0,
    servings: 1,
    difficulty: 'Dễ',
    ingredients: [
      '1 quả chuối đông lạnh',
      '100g xoài đông lạnh',
      '50ml sữa hạnh nhân',
      '1 thìa mật ong',
      'Topping: granola, dừa sấy, hạt chia',
      'Trái cây tươi: thanh long, kiwi, dâu',
    ],
    instructions: [
      'Cho chuối, xoài đông lạnh vào máy xay.',
      'Thêm sữa hạnh nhân và mật ong.',
      'Xay nhuyễn cho đến khi mịn và đặc.',
      'Đổ ra bát, trang trí với granola, dừa sấy.',
      'Xếp trái cây tươi lên trên theo hình đẹp mắt.',
      'Rắc hạt chia và thưởng thức ngay.',
    ],
    image: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800',
    tags: ['smoothie', 'healthy', 'ăn sáng', 'tropical'],
    viewCount: 420,
    likeCount: 135,
    saveCount: 72,
    ratingCount: 22,
    averageRating: 4.3,
  },
  {
    name: 'Sushi Cá Hồi',
    description: 'Sushi cá hồi tươi ngon với cơm trộn giấm và wasabi, kiểu Nhật truyền thống.',
    category: 'asian',
    cuisine: 'japanese',
    prepTime: 40,
    cookTime: 20,
    servings: 4,
    difficulty: 'Khó',
    ingredients: [
      '300g cá hồi sashimi grade',
      '400g gạo Nhật',
      '60ml giấm sushi',
      '2 thìa đường',
      '1 thìa muối',
      'Rong biển nori',
      'Wasabi, gừng ngâm',
      'Nước tương Nhật',
    ],
    instructions: [
      'Vo gạo kỹ, ngâm 30 phút rồi nấu với tỉ lệ nước 1:1.',
      'Pha giấm sushi với đường và muối, đun tan.',
      'Trộn giấm vào cơm nóng, quạt cho nguội.',
      'Thái cá hồi thành lát mỏng đều.',
      'Nắm cơm thành miếng nhỏ, đặt cá hồi lên trên.',
      'Phết một ít wasabi giữa cơm và cá.',
      'Ăn kèm với gừng ngâm và nước tương.',
    ],
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800',
    tags: ['sushi', 'nhật bản', 'cá hồi', 'sashimi'],
    viewCount: 780,
    likeCount: 220,
    saveCount: 110,
    ratingCount: 38,
    averageRating: 4.8,
  },
];

// Sample users data - Password: "password123" for all
const SAMPLE_USERS = [
  {
    name: 'Chef Minh',
    email: 'chef.minh@cookshare.com',
    password: 'password123', // Will be hashed
    avatar: 'https://i.pravatar.cc/150?img=1',
    bio: 'Đầu bếp chuyên nghiệp với 10 năm kinh nghiệm',
    level: 5,
    points: 2500,
  },
  {
    name: 'Bếp Nhà',
    email: 'bepnha@cookshare.com',
    password: 'password123', // Will be hashed
    avatar: 'https://i.pravatar.cc/150?img=2',
    bio: 'Chia sẻ công thức nấu ăn gia đình',
    level: 3,
    points: 1200,
  },
  {
    name: 'Healthy Kitchen',
    email: 'healthy@cookshare.com',
    password: 'password123', // Will be hashed
    avatar: 'https://i.pravatar.cc/150?img=3',
    bio: 'Chuyên các món ăn healthy và low carb',
    level: 4,
    points: 1800,
  },
];

async function seedDatabase() {
  console.log('🌱 Starting database seed...\n');

  try {
    const { db } = await connectToDatabase();

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await db.collection('users').deleteMany({});
    await db.collection('recipes').deleteMany({});
    await db.collection('recipe_ratings').deleteMany({});
    await db.collection('recipe_saves').deleteMany({});
    await db.collection('recipe_likes').deleteMany({});

    // Insert users (hash passwords)
    console.log('👤 Inserting sample users...');
    const usersWithHashedPasswords = await Promise.all(
      SAMPLE_USERS.map(async (user) => {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        return {
          ...user,
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      })
    );
    
    const usersResult = await db.collection('users').insertMany(usersWithHashedPasswords);
    const userIds = Object.values(usersResult.insertedIds);
    console.log(`   ✅ Inserted ${userIds.length} users`);
    console.log('\n📧 Login credentials (password: password123):');
    SAMPLE_USERS.forEach(user => {
      console.log(`   - ${user.email}`);
    });

    // Insert recipes with author info
    console.log('📖 Inserting sample recipes...');
    const recipesWithAuthors = SAMPLE_RECIPES.map((recipe, index) => {
      const authorIndex = index % SAMPLE_USERS.length;
      return {
        ...recipe,
        authorId: userIds[authorIndex].toString(),
        authorName: SAMPLE_USERS[authorIndex].name,
        authorAvatar: SAMPLE_USERS[authorIndex].avatar,
        isPublic: true,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
        updatedAt: new Date(),
      };
    });

    const recipesResult = await db.collection('recipes').insertMany(recipesWithAuthors);
    console.log(`   ✅ Inserted ${recipesResult.insertedCount} recipes`);

    // Create some achievements for users
    console.log('🏆 Creating user achievements...');
    const achievements = userIds.map((userId, index) => ({
      userId: userId.toString(),
      currentStreak: Math.floor(Math.random() * 10) + 1,
      longestStreak: Math.floor(Math.random() * 30) + 10,
      totalMealsCooked: Math.floor(Math.random() * 100) + 20,
      totalRecipesCreated: Math.floor(Math.random() * 20) + 5,
      totalPoints: SAMPLE_USERS[index].points,
      level: SAMPLE_USERS[index].level,
      badges: [
        { id: 'first_recipe', name: 'Công thức đầu tiên', earnedAt: new Date() },
        { id: 'streak_7', name: 'Chuỗi 7 ngày', earnedAt: new Date() },
      ],
      lastCookingDate: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await db.collection('achievements').insertMany(achievements);
    console.log(`   ✅ Created achievements for ${achievements.length} users`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Users: ${userIds.length}`);
    console.log(`   - Recipes: ${recipesResult.insertedCount}`);
    console.log(`   - Achievements: ${achievements.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();

