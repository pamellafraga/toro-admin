import pg from "pg"

const adminPool = new pg.Pool({
  host: "admxpress.postgresql.dbaas.com.br",
  port: 5432,
  database: "admxpress",
  user: "admxpress",
  password: "Xpress@101029",
  ssl: false,
})

const saasPool = new pg.Pool({
  host: "licitapro.postgresql.dbaas.com.br",
  port: 5432,
  database: "licitapro",
  user: "licitapro",
  password: "Xpress@101029",
  ssl: { rejectUnauthorized: false },
})

const NEW_END = "2026-06-20T03:00:00.000Z"

const mappings = [
  {
    contract_id: "dbc474e7-a48c-413c-8820-ce4e3395f859",
    empresa_id: "cmprm7xwm0000zf0og19t3qlz",
    usuario_id: "cmprm7xyh0002zf0o172c4rc2",
  },
  {
    contract_id: "b6a000d7-1847-4945-ae7f-7c0d3ae9c587",
    empresa_id: "cmpvk515m0000zfpknzsbsde1",
    usuario_id: "cmpvk51790002zfpk0k8n5s95",
  },
  {
    contract_id: "d7050bff-1ccb-4324-b3d1-ab8ab3b72484",
    empresa_id: "cmpvkhxvk0000zfvwllah3w1u",
    usuario_id: "cmpvkhxwz0002zfvwm7pheaos",
  },
  {
    contract_id: "eb044102-2a75-462b-8838-9c1c7722f839",
    empresa_id: "cmpyawv0q0000zfsgi2rqtlly",
    usuario_id: "cmpyawv2b0002zfsg32wlubwb",
  },
  {
    contract_id: "20f8b4e5-091a-44ab-af0c-4102c7fed092",
    empresa_id: "cmpyb30lj0000zfjw5l6rzipq",
    usuario_id: "cmpyb30n60002zfjwnaq1mucj",
  },
]

for (const item of mappings) {
  await saasPool.query(
    `UPDATE "Empresa"
     SET "assinaturaVencimento" = $2, "emTesteGratuito" = true, "ativa" = true, "updatedAt" = NOW()
     WHERE id = $1`,
    [item.empresa_id, NEW_END],
  )

  const contractRes = await adminPool.query(`SELECT liticapro_meta FROM contracts WHERE id = $1`, [
    item.contract_id,
  ])
  const meta = contractRes.rows[0]?.liticapro_meta ?? {}
  await adminPool.query(
    `UPDATE contracts SET liticapro_meta = liticapro_meta || $2::jsonb WHERE id = $1`,
    [
      item.contract_id,
      JSON.stringify({
        ...meta,
        saas_empresa_id: item.empresa_id,
        saas_usuario_id: item.usuario_id,
        saas_usuario_ids: [item.usuario_id],
        saas_provisioned_at: meta.saas_provisioned_at ?? new Date().toISOString(),
        saas_courtesy_synced_at: new Date().toISOString(),
      }),
    ],
  )

  console.log("OK SaaS + admin meta:", item.contract_id, item.empresa_id)
}

await saasPool.end()
await adminPool.end()
