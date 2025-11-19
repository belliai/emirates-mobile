// Script untuk test koneksi Supabase dan verifikasi tabel
// Jalankan dengan: node scripts/test-supabase-connection.js

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Environment variables tidak ditemukan!')
  console.error('Pastikan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY ada di .env.local')
  process.exit(1)
}

console.log('🔗 Testing Supabase connection...')
console.log('URL:', supabaseUrl.substring(0, 30) + '...')

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
})

async function testConnection() {
  try {
    // Test 1: List semua tabel di schema public
    console.log('\n📋 Test 1: Listing tables in public schema...')
    const { data: tables, error: tablesError } = await supabase
      .from('_prisma_migrations')
      .select('*')
      .limit(0)
    
    // Alternative: Try to query information_schema
    console.log('   (Trying to detect tables...)')

    // Test 2: Query load_plans
    console.log('\n📋 Test 2: Querying load_plans table...')
    const { data: loadPlans, error: loadPlansError } = await supabase
      .schema('public')
      .from('load_plans')
      .select('*')
      .limit(1)

    if (loadPlansError) {
      console.error('❌ Error querying load_plans:')
      console.error('   Code:', loadPlansError.code)
      console.error('   Message:', loadPlansError.message)
      console.error('   Details:', loadPlansError.details)
      console.error('   Hint:', loadPlansError.hint)
      
      // Check if it's a schema cache issue
      if (loadPlansError.message?.includes('schema cache') || loadPlansError.code === 'PGRST116') {
        console.error('\n💡 Solution:')
        console.error('   1. Buka Supabase Dashboard > Settings > API')
        console.error('   2. Klik "Refresh schema cache"')
        console.error('   3. Atau restart project di Supabase Dashboard')
      }
    } else {
      console.log('✅ Successfully connected to load_plans table!')
      console.log('   Found', loadPlans?.length || 0, 'rows')
    }

    // Test 3: Query load_plan_items
    console.log('\n📋 Test 3: Querying load_plan_items table...')
    const { data: items, error: itemsError } = await supabase
      .schema('public')
      .from('load_plan_items')
      .select('*')
      .limit(1)

    if (itemsError) {
      console.error('❌ Error querying load_plan_items:')
      console.error('   Code:', itemsError.code)
      console.error('   Message:', itemsError.message)
    } else {
      console.log('✅ Successfully connected to load_plan_items table!')
      console.log('   Found', items?.length || 0, 'rows')
    }

    console.log('\n✅ Connection test completed!')
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

testConnection()

