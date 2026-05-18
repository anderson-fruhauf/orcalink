import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { initializeApp, cert, type ServiceAccount } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL']! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Initialize Firebase Admin SDK
const serviceAccountPath = process.env['FIREBASE_SERVICE_ACCOUNT_PATH']
  || resolve(process.cwd(), 'firebase-service-account.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8')) as ServiceAccount;

initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth();

async function main() {
  console.log('Seeding database...');

  // --- Tenant ---
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Orcalink',
      plan: 'FREE',
    },
  });
  console.log(`Tenant created: ${tenant.name} (${tenant.id})`);

  // --- Admin User (Firebase + Prisma) ---
  let firebaseUser;
  try {
    firebaseUser = await auth.getUserByEmail('admin@orcalink.com');
    console.log(`Firebase user already exists: ${firebaseUser.uid}`);
  } catch {
    firebaseUser = await auth.createUser({
      email: 'admin@orcalink.com',
      password: '123456',
      displayName: 'Admin',
    });
    console.log(`Firebase user created: ${firebaseUser.uid}`);
  }

  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@orcalink.com',
      firebaseUid: firebaseUser.uid,
      name: 'Admin',
    },
  });
  console.log(`Admin user created: ${admin.email} (firebaseUid: ${firebaseUser.uid})`);

  // --- Categories ---
  const categoriesData = [
    { name: 'Matéria-Prima' },
    { name: 'Embalagem' },
    { name: 'Material de Limpeza' },
    { name: 'EPI' },
    { name: 'Serviços' },
  ];

  const categories = await Promise.all(
    categoriesData.map((cat) =>
      prisma.category.create({
        data: {
          tenantId: tenant.id,
          name: cat.name,
        },
      }),
    ),
  );
  console.log(`${categories.length} categories created`);

  // --- Products ---
  const productsData = [
    { name: 'Aço Carbono 3/4', categoryName: 'Matéria-Prima', unit: 'kg', internalCode: 'AC-001' },
    { name: 'Alumínio 5052', categoryName: 'Matéria-Prima', unit: 'kg', internalCode: 'AL-002' },
    { name: 'Caixa de Papelão 40x30x20', categoryName: 'Embalagem', unit: 'un', internalCode: 'EMB-001' },
    { name: 'Fita Adesiva Transparente 50mm', categoryName: 'Embalagem', unit: 'un', internalCode: 'EMB-002' },
    { name: 'Detergente Neutro 5L', categoryName: 'Material de Limpeza', unit: 'un', internalCode: 'LIM-001' },
    { name: 'Luvas Nitrílicas M', categoryName: 'EPI', unit: 'par', internalCode: 'EPI-001' },
    { name: 'Óculos de Proteção', categoryName: 'EPI', unit: 'un', internalCode: 'EPI-002' },
    { name: 'Manutenção de Compressor', categoryName: 'Serviços', unit: 'serv', internalCode: null },
  ];

  const products = await Promise.all(
    productsData.map((prod) => {
      const category = categories.find((c) => c.name === prod.categoryName)!;
      return prisma.product.create({
        data: {
          tenantId: tenant.id,
          categoryId: category.id,
          name: prod.name,
          unit: prod.unit,
          internalCode: prod.internalCode,
        },
      });
    }),
  );
  console.log(`${products.length} products created`);

  // --- Suppliers ---
  const suppliersData = [
    { name: 'Aços Brasil Ltda', document: '11.222.333/0001-01', contactName: 'Carlos', email: 'carlos@acosbrasil.com', phone: '(11) 99999-0001' },
    { name: 'Embalax S.A.', document: '22.333.444/0001-02', contactName: 'Maria', email: 'maria@embalax.com', phone: '(11) 99999-0002' },
    { name: 'Limpeza Total ME', document: '33.444.555/0001-03', contactName: 'João', email: 'joao@limpezatotal.com', phone: '(11) 99999-0003' },
    { name: 'EPI Master', document: '44.555.666/0001-04', contactName: 'Ana', email: 'ana@epimaster.com', phone: '(11) 99999-0004' },
    { name: 'Serviços Gerais SS', document: '55.666.777/0001-05', contactName: 'Pedro', email: 'pedro@servicosgerais.com', phone: '(11) 99999-0005' },
  ];

  const suppliers = await Promise.all(
    suppliersData.map((sup) =>
      prisma.supplier.create({
        data: {
          tenantId: tenant.id,
          name: sup.name,
          document: sup.document,
          contactName: sup.contactName,
          email: sup.email,
          phone: sup.phone,
        },
      }),
    ),
  );
  console.log(`${suppliers.length} suppliers created`);

  // --- SupplierCategory (link suppliers to categories they serve) ---
  const supplierCategoryLinks = [
    { supplierName: 'Aços Brasil Ltda', categoryName: 'Matéria-Prima' },
    { supplierName: 'Embalax S.A.', categoryName: 'Embalagem' },
    { supplierName: 'Limpeza Total ME', categoryName: 'Material de Limpeza' },
    { supplierName: 'EPI Master', categoryName: 'EPI' },
    { supplierName: 'Serviços Gerais SS', categoryName: 'Serviços' },
  ];

  for (const link of supplierCategoryLinks) {
    const supplier = suppliers.find((s) => s.name === link.supplierName)!;
    const category = categories.find((c) => c.name === link.categoryName)!;
    await prisma.supplierCategory.create({
      data: {
        supplierId: supplier.id,
        categoryId: category.id,
      },
    });
  }
  console.log(`${supplierCategoryLinks.length} supplier-category links created`);

  // --- Quotation ---
  const quotation = await prisma.quotation.create({
    data: {
      tenantId: tenant.id,
      title: 'Cotação Mensal - Junho 2026',
      deadline: new Date('2026-06-30'),
      status: 'DRAFT',
    },
  });
  console.log(`Quotation created: ${quotation.title}`);

  // --- Quotation Items ---
  const quotationItemsData = [
    { productName: 'Aço Carbono 3/4', quantity: 100 },
    { productName: 'Caixa de Papelão 40x30x20', quantity: 500 },
    { productName: 'Detergente Neutro 5L', quantity: 20 },
    { productName: 'Luvas Nitrílicas M', quantity: 50 },
  ];

  for (const item of quotationItemsData) {
    const product = products.find((p) => p.name === item.productName)!;
    await prisma.quotationItem.create({
      data: {
        quotationId: quotation.id,
        productId: product.id,
        quantity: item.quantity,
      },
    });
  }
  console.log(`${quotationItemsData.length} quotation items created`);

  // --- QuotationSupplier (invite suppliers) ---
  const invitedSuppliers = ['Aços Brasil Ltda', 'Embalax S.A.', 'Limpeza Total ME', 'EPI Master'];
  for (const supplierName of invitedSuppliers) {
    const supplier = suppliers.find((s) => s.name === supplierName)!;
    await prisma.quotationSupplier.create({
      data: {
        quotationId: quotation.id,
        supplierId: supplier.id,
        responseStatus: 'PENDING',
      },
    });
  }
  console.log(`${invitedSuppliers.length} suppliers invited to quotation`);

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
