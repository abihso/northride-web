import { useMemo, useRef, useState, type FormEvent } from "react";
import ShopLocationPicker, { type ShopLocation } from "./ShopLocationPicker";

export type ManagedShop = {
  shopId: number;
  ownerId: number;
  shopName: string;
  shopDescription: string | null;
  shopCategory: string | null;
  address: string;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
  phoneNumber: string | null;
  email: string | null;
  logo: string | null;
  logoViewUrl?: string | null;
  coverImage: string | null;
  coverImageViewUrl?: string | null;
  isOpen: boolean | null;
  isVerified: boolean | null;
  rating: string | null;
};

export type ManagedProduct = {
  productId: number;
  shopId: number;
  productName: string;
  productDescription: string | null;
  category: string | null;
  price: string;
  discountPrice: string | null;
  stockQuantity: number | null;
  unit: string | null;
  imageUrl: string | null;
  imageViewUrl?: string | null;
  isAvailable: boolean | null;
  isFeatured: boolean | null;
  preparationTime: number | null;
};

export type ManagedShopDetails = ManagedShop & { products: ManagedProduct[] };

export type ShopDraft = {
  ownerId: number;
  shopName: string;
  shopDescription: string | null;
  shopCategory: string;
  address: string;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phoneNumber: string | null;
  email: string | null;
  logo: string | null;
  coverImage: string | null;
  isOpen: boolean;
  isVerified: boolean;
};

export type ProductDraft = {
  productName: string;
  productDescription: string | null;
  category: string | null;
  price: number;
  discountPrice: number | null;
  stockQuantity: number;
  unit: string;
  imageUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  preparationTime: number;
};

type Owner = {
  userId: number;
  fullName: string | null;
  email: string;
  userType: string;
  isActive: boolean;
};

type ShopForm = {
  ownerId: string;
  shopName: string;
  shopDescription: string;
  shopCategory: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: string;
  longitude: string;
  phoneNumber: string;
  email: string;
  logo: string;
  coverImage: string;
  isOpen: boolean;
  isVerified: boolean;
};

type ProductForm = {
  productName: string;
  productDescription: string;
  category: string;
  price: string;
  discountPrice: string;
  stockQuantity: string;
  unit: string;
  imageUrl: string;
  isAvailable: boolean;
  isFeatured: boolean;
  preparationTime: string;
};

const blankShop: ShopForm = {
  ownerId: "",
  shopName: "",
  shopDescription: "",
  shopCategory: "groceries",
  address: "",
  city: "",
  state: "",
  country: "Ghana",
  latitude: "",
  longitude: "",
  phoneNumber: "",
  email: "",
  logo: "",
  coverImage: "",
  isOpen: true,
  isVerified: false,
};

const blankProduct: ProductForm = {
  productName: "",
  productDescription: "",
  category: "",
  price: "",
  discountPrice: "",
  stockQuantity: "0",
  unit: "piece",
  imageUrl: "",
  isAvailable: true,
  isFeatured: false,
  preparationTime: "0",
};

function shopForm(shop?: ManagedShop): ShopForm {
  if (!shop) return blankShop;
  return {
    ownerId: String(shop.ownerId),
    shopName: shop.shopName,
    shopDescription: shop.shopDescription ?? "",
    shopCategory: shop.shopCategory ?? "groceries",
    address: shop.address,
    city: shop.city ?? "",
    state: shop.state ?? "",
    country: shop.country ?? "",
    latitude: shop.latitude ?? "",
    longitude: shop.longitude ?? "",
    phoneNumber: shop.phoneNumber ?? "",
    email: shop.email ?? "",
    logo: shop.logo ?? "",
    coverImage: shop.coverImage ?? "",
    isOpen: shop.isOpen === true,
    isVerified: shop.isVerified === true,
  };
}

function productForm(product?: ManagedProduct): ProductForm {
  if (!product) return blankProduct;
  return {
    productName: product.productName,
    productDescription: product.productDescription ?? "",
    category: product.category ?? "",
    price: product.price,
    discountPrice: product.discountPrice ?? "",
    stockQuantity: String(product.stockQuantity ?? 0),
    unit: product.unit ?? "piece",
    imageUrl: product.imageUrl ?? "",
    isAvailable: product.isAvailable !== false,
    isFeatured: product.isFeatured === true,
    preparationTime: String(product.preparationTime ?? 0),
  };
}

function nullable(value: string) {
  return value.trim() || null;
}

function optionalCoordinate(value: string) {
  return value.trim() ? Number(value) : null;
}

function isSupportedImageFile(file: File) {
  return (
    ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
    file.size > 0 &&
    file.size <= 5 * 1024 * 1024
  );
}

export default function ShopManagementSection({
  shops,
  owners,
  busyKey,
  onCreateShop,
  onUpdateShop,
  onDeleteShop,
  onLoadShop,
  onCreateProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUploadImage,
}: {
  shops: ManagedShop[];
  owners: Owner[];
  busyKey: string | null;
  onCreateShop: (draft: ShopDraft) => Promise<ManagedShop | null>;
  onUpdateShop: (shopId: number, draft: ShopDraft) => Promise<ManagedShop | null>;
  onDeleteShop: (shop: ManagedShop) => Promise<boolean>;
  onLoadShop: (shopId: number) => Promise<ManagedShopDetails | null>;
  onCreateProduct: (
    shopId: number,
    draft: ProductDraft,
  ) => Promise<ManagedProduct | null>;
  onUpdateProduct: (
    productId: number,
    draft: ProductDraft,
  ) => Promise<ManagedProduct | null>;
  onDeleteProduct: (product: ManagedProduct) => Promise<boolean>;
  onUploadImage: (file: File) => Promise<string | null>;
}) {
  const [query, setQuery] = useState("");
  const [editingShop, setEditingShop] = useState<ManagedShop | null>(null);
  const [shopDraft, setShopDraft] = useState<ShopForm>(blankShop);
  const [shopModalOpen, setShopModalOpen] = useState(false);
  const [shopFormError, setShopFormError] = useState("");
  const [shopLogoFile, setShopLogoFile] = useState<File | null>(null);
  const [shopCoverFile, setShopCoverFile] = useState<File | null>(null);
  const [selectedShop, setSelectedShop] = useState<ManagedShopDetails | null>(
    null,
  );
  const [failedShop, setFailedShop] = useState<ManagedShop | null>(null);
  const [loadingShopId, setLoadingShopId] = useState<number | null>(null);
  const [detailError, setDetailError] = useState("");
  const [editingProduct, setEditingProduct] = useState<ManagedProduct | null>(
    null,
  );
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productDraft, setProductDraft] = useState<ProductForm>(blankProduct);
  const [productFormError, setProductFormError] = useState("");
  const [productImageFile, setProductImageFile] = useState<File | null>(null);

  const searchableShops = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return shops;
    return shops.filter((shop) =>
      [
        shop.shopName,
        shop.shopCategory,
        shop.address,
        shop.city,
        shop.phoneNumber,
        shop.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, shops]);

  const openShop = async (shop: ManagedShop) => {
    setLoadingShopId(shop.shopId);
    setDetailError("");
    const details = await onLoadShop(shop.shopId);
    setLoadingShopId(null);
    if (details) {
      setSelectedShop(details);
      setFailedShop(null);
    } else {
      setFailedShop(shop);
      setDetailError("Could not load this shop's products. Try again.");
    }
  };

  const submitShop = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ownerId = Number(shopDraft.ownerId);
    const latitude = optionalCoordinate(shopDraft.latitude);
    const longitude = optionalCoordinate(shopDraft.longitude);
    if (!Number.isSafeInteger(ownerId) || ownerId < 1) {
      setShopFormError("Select an account to own this shop.");
      return;
    }
    const hasLatitude = Boolean(shopDraft.latitude.trim());
    const hasLongitude = Boolean(shopDraft.longitude.trim());
    if (
      (!editingShop && (!hasLatitude || !hasLongitude)) ||
      hasLatitude !== hasLongitude
    ) {
      setShopFormError("Select the shop's exact location on the map.");
      return;
    }
    if (
      (shopDraft.latitude.trim() && latitude === null) ||
      (shopDraft.longitude.trim() && longitude === null) ||
      (latitude !== null && (latitude < -90 || latitude > 90)) ||
      (longitude !== null && (longitude < -180 || longitude > 180))
    ) {
      setShopFormError("Enter valid latitude and longitude coordinates.");
      return;
    }
    setShopFormError("");
    const logo = shopLogoFile
      ? await onUploadImage(shopLogoFile)
      : nullable(shopDraft.logo);
    if (shopLogoFile && !logo) return;
    const coverImage = shopCoverFile
      ? await onUploadImage(shopCoverFile)
      : nullable(shopDraft.coverImage);
    if (shopCoverFile && !coverImage) return;
    const payload: ShopDraft = {
      ownerId,
      shopName: shopDraft.shopName.trim(),
      shopDescription: nullable(shopDraft.shopDescription),
      shopCategory: shopDraft.shopCategory.trim(),
      address: shopDraft.address.trim(),
      city: nullable(shopDraft.city),
      state: nullable(shopDraft.state),
      country: nullable(shopDraft.country),
      latitude,
      longitude,
      phoneNumber: nullable(shopDraft.phoneNumber),
      email: nullable(shopDraft.email),
      logo,
      coverImage,
      isOpen: shopDraft.isOpen,
      isVerified: shopDraft.isVerified,
    };
    const saved = editingShop
      ? await onUpdateShop(editingShop.shopId, payload)
      : await onCreateShop(payload);
    if (saved) {
      setEditingShop(null);
      setShopDraft(blankShop);
      setShopLogoFile(null);
      setShopCoverFile(null);
      setShopModalOpen(false);
    }
  };

  const showShopForm = (shop?: ManagedShop) => {
    setEditingShop(shop ?? null);
    setShopDraft(shopForm(shop));
    setShopLogoFile(null);
    setShopCoverFile(null);
    setShopFormError("");
    setShopModalOpen(true);
  };

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedShop) return;
    const price = Number(productDraft.price);
    const discountPrice = productDraft.discountPrice.trim()
      ? Number(productDraft.discountPrice)
      : null;
    const stockQuantity = Number(productDraft.stockQuantity);
    const preparationTime = Number(productDraft.preparationTime);
    if (!Number.isFinite(price) || price < 0 || price > 99999999.99) {
      setProductFormError("Enter a valid price.");
      return;
    }
    if (
      discountPrice !== null &&
      (!Number.isFinite(discountPrice) || discountPrice < 0 || discountPrice >= price)
    ) {
      setProductFormError("Discount price must be less than the regular price.");
      return;
    }
    if (!Number.isSafeInteger(stockQuantity) || stockQuantity < 0) {
      setProductFormError("Stock must be a non-negative whole number.");
      return;
    }
    if (!Number.isSafeInteger(preparationTime) || preparationTime < 0) {
      setProductFormError("Preparation time must be a non-negative whole number.");
      return;
    }
    setProductFormError("");
    const imageUrl = productImageFile
      ? await onUploadImage(productImageFile)
      : nullable(productDraft.imageUrl);
    if (productImageFile && !imageUrl) return;
    const payload: ProductDraft = {
      productName: productDraft.productName.trim(),
      productDescription: nullable(productDraft.productDescription),
      category: nullable(productDraft.category),
      price,
      discountPrice,
      stockQuantity,
      unit: productDraft.unit.trim() || "piece",
      imageUrl,
      isAvailable: productDraft.isAvailable,
      isFeatured: productDraft.isFeatured,
      preparationTime,
    };
    const saved = editingProduct
      ? await onUpdateProduct(editingProduct.productId, payload)
      : await onCreateProduct(selectedShop.shopId, payload);
    if (saved) {
      setSelectedShop((current) =>
        current
          ? {
              ...current,
              products: editingProduct
                ? current.products.map((item) =>
                    item.productId === saved.productId ? saved : item,
                  )
                : [saved, ...current.products],
            }
          : current,
      );
      setEditingProduct(null);
      setProductDraft(blankProduct);
      setProductImageFile(null);
      setProductModalOpen(false);
    }
  };

  const startProductEdit = (product?: ManagedProduct) => {
    setEditingProduct(product ?? null);
    setProductDraft(productForm(product));
    setProductImageFile(null);
    setProductFormError("");
    setProductModalOpen(true);
  };

  if (selectedShop) {
    return (
      <div className="shop-management">
        <div className="shop-detail-toolbar">
          <button
            className="button secondary"
            onClick={() => {
              setSelectedShop(null);
              setDetailError("");
            }}
          >
            ← All shops
          </button>
          <button className="button primary" onClick={() => startProductEdit()}>
            + Add product
          </button>
        </div>
        {detailError ? (
          <div className="alert error" role="alert">
            <span>{detailError}</span>
            {failedShop ? (
              <button
                type="button"
                onClick={() => void openShop(failedShop)}
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
        <article className="record-card shop-detail-card">
          <div className="shop-detail-main">
            {selectedShop.logo ? (
              <img className="shop-logo large" src={selectedShop.logoViewUrl || selectedShop.logo} alt="" />
            ) : (
              <div className="shop-logo large shop-logo-empty">S</div>
            )}
            <div className="record-copy">
              <div className="record-title">
                <h3>{selectedShop.shopName}</h3>
                <ShopStatus open={selectedShop.isOpen === true} />
                <span
                  className={`status-pill ${selectedShop.isVerified ? "positive" : "warning"}`}
                >
                  {selectedShop.isVerified ? "Verified" : "Not verified"}
                </span>
              </div>
              <p>
                {[selectedShop.shopCategory, selectedShop.city, selectedShop.address]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {selectedShop.shopDescription ? (
                <p>{selectedShop.shopDescription}</p>
              ) : null}
              <div className="detail-chips">
                <span>Owner ID {selectedShop.ownerId}</span>
                {selectedShop.phoneNumber ? <span>{selectedShop.phoneNumber}</span> : null}
                {selectedShop.email ? <span>{selectedShop.email}</span> : null}
                {selectedShop.rating ? <span>★ {selectedShop.rating}</span> : null}
              </div>
            </div>
          </div>
          <div className="panel-heading shop-products-heading">
            <div>
              <h3>Products ({selectedShop.products.length})</h3>
              <p>Manage product details, pricing, stock, and availability.</p>
            </div>
          </div>
          {selectedShop.products.length ? (
            <div className="record-list">
              {selectedShop.products.map((product) => (
                <article className="record-card product-card" key={product.productId}>
                  {product.imageUrl ? (
                    <img className="product-thumbnail" src={product.imageViewUrl || product.imageUrl} alt="" />
                  ) : (
                    <div className="product-thumbnail product-image-empty">P</div>
                  )}
                  <div className="record-copy">
                    <div className="record-title">
                      <h3>{product.productName}</h3>
                      <span
                        className={`status-pill ${product.isAvailable ? "positive" : "neutral"}`}
                      >
                        {product.isAvailable ? "Available" : "Unavailable"}
                      </span>
                      {product.isFeatured ? (
                        <span className="status-pill warning">Featured</span>
                      ) : null}
                    </div>
                    <p>
                      {[product.category, `GHS ${Number(product.price).toFixed(2)}`,
                        product.discountPrice
                          ? `Sale GHS ${Number(product.discountPrice).toFixed(2)}`
                          : null,
                        `${product.stockQuantity ?? 0} ${product.unit ?? "piece"}`,
                        product.preparationTime
                          ? `${product.preparationTime} min`
                          : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {product.productDescription ? (
                      <p>{product.productDescription}</p>
                    ) : null}
                  </div>
                  <div className="record-actions">
                    <button
                      className="button secondary"
                      disabled={Boolean(busyKey)}
                      onClick={() => startProductEdit(product)}
                    >
                      Edit
                    </button>
                    <button
                      className="button danger-outline"
                      disabled={Boolean(busyKey)}
                      onClick={async () => {
                        if (
                          window.confirm(
                            `Delete product "${product.productName}" from ${selectedShop.shopName}?`,
                          ) &&
                          (await onDeleteProduct(product))
                        ) {
                          setSelectedShop((current) =>
                            current
                              ? {
                                  ...current,
                                  products: current.products.filter(
                                    (item) => item.productId !== product.productId,
                                  ),
                                }
                              : current,
                          );
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">
              <span>＋</span>
              <strong>No products yet</strong>
              <p>Add products to make this shop’s catalog available.</p>
            </div>
          )}
          {editingProduct ? (
            <ProductEditor
              draft={productDraft}
              error={productFormError}
              busy={Boolean(busyKey)}
              busyLabel={busyKey?.startsWith("product-") ? "Saving…" : ""}
              isEditing
              onClose={() => {
                setEditingProduct(null);
                setProductModalOpen(false);
              }}
              onSubmit={submitProduct}
              onDraft={setProductDraft}
              imageFile={productImageFile}
              onImageFile={setProductImageFile}
              onError={setProductFormError}
              imagePreview={editingProduct.imageViewUrl ?? null}
            />
          ) : null}
          {productModalOpen && !editingProduct ? (
            <ProductEditor
              draft={productDraft}
              error={productFormError}
              busy={Boolean(busyKey)}
              busyLabel={busyKey?.startsWith("product-") ? "Saving…" : ""}
              isEditing={false}
              onClose={() => setProductModalOpen(false)}
              onSubmit={submitProduct}
              onDraft={setProductDraft}
              imageFile={productImageFile}
              onImageFile={setProductImageFile}
              onError={setProductFormError}
              imagePreview={null}
            />
          ) : null}
        </article>
      </div>
    );
  }

  return (
    <div className="shop-management">
      <div className="shop-management-toolbar">
        <div>
          <strong>{shops.length} shops</strong>
          <span>Create shops and maintain their customer-facing product catalogs.</span>
        </div>
        <div className="shop-toolbar-actions">
          <input
            className="search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search shops"
            aria-label="Search shops"
          />
          <button
            className="button primary"
            disabled={Boolean(busyKey)}
            onClick={() => showShopForm()}
          >
            + Add shop
          </button>
        </div>
      </div>
      {searchableShops.length ? (
        <div className="record-list">
          {searchableShops.map((shop) => {
            const owner = owners.find((account) => account.userId === shop.ownerId);
            return (
              <article className="record-card shop-card" key={shop.shopId}>
                {shop.logo ? (
                  <img className="shop-logo" src={shop.logoViewUrl || shop.logo} alt="" />
                ) : (
                  <div className="shop-logo shop-logo-empty">S</div>
                )}
                <div className="record-copy">
                  <div className="record-title">
                    <h3>{shop.shopName}</h3>
                    <ShopStatus open={shop.isOpen === true} />
                    <span
                      className={`status-pill ${shop.isVerified ? "positive" : "warning"}`}
                    >
                      {shop.isVerified ? "Verified" : "Not verified · hidden in app"}
                    </span>
                  </div>
                  <p>
                    {[shop.shopCategory, shop.city, shop.address]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p>
                    Owner: {owner?.fullName || owner?.email || `Account ${shop.ownerId}`}
                  </p>
                </div>
                <div className="record-actions shop-actions">
                  <button
                    className="button primary"
                    disabled={Boolean(busyKey) || loadingShopId === shop.shopId}
                    onClick={() => void openShop(shop)}
                  >
                    {loadingShopId === shop.shopId ? "Loading…" : "Products"}
                  </button>
                  <button
                    className="button secondary"
                    disabled={Boolean(busyKey)}
                    onClick={() => showShopForm(shop)}
                  >
                    Edit
                  </button>
                  <button
                    className="button danger-outline"
                    disabled={Boolean(busyKey)}
                    onClick={async () => {
                      if (
                        window.confirm(
                          `Permanently delete "${shop.shopName}" and its products? Shops with order history cannot be deleted.`,
                        )
                      ) {
                        await onDeleteShop(shop);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <span>＋</span>
          <strong>{query ? "No shops match your search" : "No shops created yet"}</strong>
          <p>
            {query
              ? "Try another shop name, category, or location."
              : "Create a shop to start building its product catalog."}
          </p>
        </div>
      )}
      {shopModalOpen ? (
        <ShopEditor
          draft={shopDraft}
          owners={owners}
          error={shopFormError}
          busy={Boolean(busyKey)}
          isEditing={editingShop !== null}
          onClose={() => {
            setEditingShop(null);
            setShopDraft(blankShop);
            setShopModalOpen(false);
          }}
          onSubmit={submitShop}
          onDraft={setShopDraft}
          logoFile={shopLogoFile}
          coverFile={shopCoverFile}
          onLogoFile={setShopLogoFile}
          onCoverFile={setShopCoverFile}
          onError={setShopFormError}
          logoPreview={editingShop?.logoViewUrl ?? null}
          coverPreview={editingShop?.coverImageViewUrl ?? null}
          onLocationChange={(location) => {
            setShopDraft((current) => ({
              ...current,
              latitude: String(location.latitude),
              longitude: String(location.longitude),
            }));
            setShopFormError("");
          }}
        />
      ) : null}
    </div>
  );
}

function ShopEditor({
  draft,
  owners,
  error,
  busy,
  isEditing,
  onClose,
  onSubmit,
  onDraft,
  logoFile,
  coverFile,
  onLogoFile,
  onCoverFile,
  onError,
  logoPreview,
  coverPreview,
  onLocationChange,
}: {
  draft: ShopForm;
  owners: Owner[];
  error: string;
  busy: boolean;
  isEditing: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDraft: (draft: ShopForm) => void;
  logoFile: File | null;
  coverFile: File | null;
  onLogoFile: (file: File | null) => void;
  onCoverFile: (file: File | null) => void;
  onError: (message: string) => void;
  logoPreview: string | null;
  coverPreview: string | null;
  onLocationChange: (location: ShopLocation) => void;
}) {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const field = (key: keyof ShopForm, value: string | boolean) =>
    onDraft({ ...draft, [key]: value });
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal-card" onSubmit={onSubmit}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">SHOP DETAILS</p>
            <h2>{isEditing ? "Edit shop" : "Add a shop"}</h2>
            <p>
              Set the owner, category, customer-facing information, and status.
              Shops appear in the customer app only when verified and open.
            </p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="user-form-grid">
          <label className="user-form-wide">
            Shop owner
            <select
              value={draft.ownerId}
              onChange={(event) => field("ownerId", event.target.value)}
              required
            >
              <option value="">Choose an account</option>
              {owners.map((owner) => (
                <option key={owner.userId} value={owner.userId}>
                  {owner.fullName || owner.email} · {owner.userType}
                  {!owner.isActive ? " · inactive" : ""}
                </option>
              ))}
            </select>
            <small>The owner must already have a NorthRide account.</small>
          </label>
          <label>
            Shop name
            <input
              value={draft.shopName}
              onChange={(event) => field("shopName", event.target.value)}
              maxLength={100}
              required
            />
          </label>
          <label>
            Category
            <select
              value={draft.shopCategory}
              onChange={(event) => field("shopCategory", event.target.value)}
              required
            >
              <option value="groceries">Groceries</option>
              <option value="food">Food</option>
            </select>
          </label>
          <label className="user-form-wide">
            Description
            <textarea
              value={draft.shopDescription}
              onChange={(event) => field("shopDescription", event.target.value)}
              maxLength={10000}
              rows={3}
            />
          </label>
          <label className="user-form-wide">
            Street address
            <input
              value={draft.address}
              onChange={(event) => field("address", event.target.value)}
              maxLength={255}
              required
            />
          </label>
          <label>
            City
            <input value={draft.city} onChange={(event) => field("city", event.target.value)} maxLength={50} />
          </label>
          <label>
            Region / state
            <input value={draft.state} onChange={(event) => field("state", event.target.value)} maxLength={50} />
          </label>
          <label>
            Country
            <input value={draft.country} onChange={(event) => field("country", event.target.value)} maxLength={50} />
          </label>
          <label>
            Phone
            <input value={draft.phoneNumber} onChange={(event) => field("phoneNumber", event.target.value)} maxLength={20} />
          </label>
          <label>
            Email
            <input type="email" value={draft.email} onChange={(event) => field("email", event.target.value)} maxLength={100} />
          </label>
          <div className="user-form-wide shop-location-field">
            <div>
              <strong>
                Shop location <span className="optional-label">Required</span>
              </strong>
              <small>Click the map to place the pin at the shop entrance or pickup point.</small>
            </div>
            <ShopLocationPicker
              location={
                draft.latitude.trim() && draft.longitude.trim()
                  ? {
                      latitude: Number(draft.latitude),
                      longitude: Number(draft.longitude),
                    }
                  : null
              }
              onSelect={onLocationChange}
            />
            {draft.latitude && draft.longitude ? (
              <small>
                Selected coordinates: {draft.latitude}, {draft.longitude}
              </small>
            ) : (
              <small className="shop-location-required">
                {isEditing
                  ? "No location is saved. Select a point to add one, or save other changes without changing the location."
                  : "Select a point on the map before creating this shop."}
              </small>
            )}
          </div>
          <label>
            Shop logo <span className="optional-label">Optional · JPG, PNG, WebP · 5 MB max</span>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) return;
                if (!isSupportedImageFile(file)) {
                  onLogoFile(null);
                  onError("Choose a JPG, PNG, or WebP image no larger than 5 MB.");
                  event.currentTarget.value = "";
                  return;
                }
                onLogoFile(file);
                onError("");
              }}
            />
            {logoPreview && !logoFile ? (
              <img className="shop-logo" src={logoPreview} alt="Current shop logo" />
            ) : null}
            {logoFile ? <span>{logoFile.name}</span> : null}
            {draft.logo || logoFile ? (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  field("logo", "");
                  onLogoFile(null);
                  if (logoInputRef.current) logoInputRef.current.value = "";
                }}
              >
                Remove logo
              </button>
            ) : null}
          </label>
          <label>
            Shop cover image <span className="optional-label">Optional · JPG, PNG, WebP · 5 MB max</span>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) return;
                if (!isSupportedImageFile(file)) {
                  onCoverFile(null);
                  onError("Choose a JPG, PNG, or WebP image no larger than 5 MB.");
                  event.currentTarget.value = "";
                  return;
                }
                onCoverFile(file);
                onError("");
              }}
            />
            {coverPreview && !coverFile ? (
              <img className="product-thumbnail" src={coverPreview} alt="Current shop cover" />
            ) : null}
            {coverFile ? <span>{coverFile.name}</span> : null}
            {draft.coverImage || coverFile ? (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  field("coverImage", "");
                  onCoverFile(null);
                  if (coverInputRef.current) coverInputRef.current.value = "";
                }}
              >
                Remove cover image
              </button>
            ) : null}
          </label>
          <label className="check-field">
            <input type="checkbox" checked={draft.isOpen} onChange={(event) => field("isOpen", event.target.checked)} />
            Open for customers
          </label>
          <label className="check-field">
            <input type="checkbox" checked={draft.isVerified} onChange={(event) => field("isVerified", event.target.checked)} />
            Verified
          </label>
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : isEditing ? "Save shop" : "Create shop"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ProductEditor({
  draft,
  error,
  busy,
  busyLabel,
  isEditing,
  onClose,
  onSubmit,
  onDraft,
  imageFile,
  onImageFile,
  onError,
  imagePreview,
}: {
  draft: ProductForm;
  error: string;
  busy: boolean;
  busyLabel: string;
  isEditing: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onDraft: (draft: ProductForm) => void;
  imageFile: File | null;
  onImageFile: (file: File | null) => void;
  onError: (message: string) => void;
  imagePreview: string | null;
}) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const field = (key: keyof ProductForm, value: string | boolean) =>
    onDraft({ ...draft, [key]: value });
  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal-card" onSubmit={onSubmit}>
        <div className="modal-heading">
          <div>
            <p className="eyebrow">PRODUCT CATALOG</p>
            <h2>{isEditing ? "Edit product" : "Add a product"}</h2>
            <p>Maintain product details, pricing, stock, and availability.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="user-form-grid">
          <label>
            Product name
            <input value={draft.productName} onChange={(event) => field("productName", event.target.value)} maxLength={100} required />
          </label>
          <label>
            Category
            <input value={draft.category} onChange={(event) => field("category", event.target.value)} maxLength={50} />
          </label>
          <label className="user-form-wide">
            Description
            <textarea value={draft.productDescription} onChange={(event) => field("productDescription", event.target.value)} rows={3} maxLength={10000} />
          </label>
          <label>
            Price (GHS)
            <input type="number" value={draft.price} onChange={(event) => field("price", event.target.value)} min="0" max="99999999.99" step="0.01" required />
          </label>
          <label>
            Discount price (GHS) <span className="optional-label">Optional</span>
            <input type="number" value={draft.discountPrice} onChange={(event) => field("discountPrice", event.target.value)} min="0" max="99999999.99" step="0.01" />
          </label>
          <label>
            Stock quantity
            <input type="number" value={draft.stockQuantity} onChange={(event) => field("stockQuantity", event.target.value)} min="0" step="1" required />
          </label>
          <label>
            Unit
            <input value={draft.unit} onChange={(event) => field("unit", event.target.value)} maxLength={20} placeholder="piece, kg, pack…" />
          </label>
          <label>
            Preparation time (minutes)
            <input type="number" value={draft.preparationTime} onChange={(event) => field("preparationTime", event.target.value)} min="0" step="1" required />
          </label>
          <label className="user-form-wide">
            Product image <span className="optional-label">Optional · JPG, PNG, WebP · 5 MB max</span>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (!file) return;
                if (!isSupportedImageFile(file)) {
                  onImageFile(null);
                  onError("Choose a JPG, PNG, or WebP image no larger than 5 MB.");
                  event.currentTarget.value = "";
                  return;
                }
                onImageFile(file);
                onError("");
              }}
            />
            {imagePreview && !imageFile ? (
              <img className="product-thumbnail" src={imagePreview} alt="Current product image" />
            ) : null}
            {imageFile ? <span>{imageFile.name}</span> : null}
            {draft.imageUrl || imageFile ? (
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={() => {
                  field("imageUrl", "");
                  onImageFile(null);
                  if (imageInputRef.current) imageInputRef.current.value = "";
                }}
              >
                Remove product image
              </button>
            ) : null}
          </label>
          <label className="check-field">
            <input type="checkbox" checked={draft.isAvailable} onChange={(event) => field("isAvailable", event.target.checked)} />
            Available to customers
          </label>
          <label className="check-field">
            <input type="checkbox" checked={draft.isFeatured} onChange={(event) => field("isFeatured", event.target.checked)} />
            Featured product
          </label>
        </div>
        {error ? <p className="form-error" role="alert">{error}</p> : null}
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          <button className="button primary" disabled={busy}>
            {busy ? busyLabel || "Saving…" : isEditing ? "Save product" : "Add product"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ShopStatus({ open }: { open: boolean }) {
  return (
    <span className={`status-pill ${open ? "positive" : "neutral"}`}>
      {open ? "Open" : "Closed"}
    </span>
  );
}
