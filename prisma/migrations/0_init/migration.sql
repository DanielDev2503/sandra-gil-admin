-- CreateTable
CREATE TABLE "Producto" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "aroma" TEXT NOT NULL,
    "dimensiones" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL,
    "url_imagen" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "cliente_nombre" TEXT NOT NULL,
    "cliente_email" TEXT NOT NULL,
    "cliente_telefono" TEXT NOT NULL,
    "ciudad" TEXT NOT NULL,
    "direccion_envio" TEXT NOT NULL,
    "notas_entrega" TEXT,
    "total_productos" DOUBLE PRECISION NOT NULL,
    "costo_envio" DOUBLE PRECISION NOT NULL,
    "total_pagado" DOUBLE PRECISION NOT NULL,
    "estado_pago" TEXT NOT NULL DEFAULT 'pendiente',
    "id_transaccion_wompi" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado_envio" TEXT NOT NULL DEFAULT 'PENDING',
    "numero_guia" TEXT,
    "notas_admin" TEXT,

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemPedido" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "pedido_id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio_unitario" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ItemPedido_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemPedido" ADD CONSTRAINT "ItemPedido_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
