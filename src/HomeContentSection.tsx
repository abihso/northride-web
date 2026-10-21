import { useRef, useState, type FormEvent } from "react";
import type {
  ManagedProduct,
  ManagedShop,
  ManagedShopDetails,
} from "./ShopManagementSection";

export type HomePageContent = {
  homeContentId: number;
  contentType: "promotion" | "suggestion";
  title: string;
  imageUrl: string;
  price: string | null;
  location: string | null;
  rating: string | null;
  linkedProduct: {
    productId: number;
    shopId: number;
    productName: string;
    shopName: string;
    price: string;
    discountPrice: string | null;
    unit: string | null;
    stockQuantity: number | null;
    isAvailable: boolean | null;
    shopCategory: string | null;
    shopOpen: boolean | null;
    shopVerified: boolean | null;
  } | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
};

export type HomeContentDraft = {
  contentType: HomePageContent["contentType"];
  title: string;
  shopId: string;
  productId: string;
  location: string;
  rating: string;
};

const emptyDraft: HomeContentDraft = {
  contentType: "promotion",
  title: "",
  shopId: "",
  productId: "",
  location: "",
  rating: "",
};

export default function HomeContentSection({
  records,
  shops,
  busyKey,
  onCreate,
  onLoadShop,
  onLinkProduct,
  onToggle,
  onDelete,
}: {
  records: HomePageContent[];
  shops: ManagedShop[];
  busyKey: string | null;
  onCreate: (draft: HomeContentDraft, image: File) => Promise<boolean>;
  onLoadShop: (shopId: number) => Promise<ManagedShopDetails | null>;
  onLinkProduct: (record: HomePageContent, productId: number) => void;
  onToggle: (record: HomePageContent) => void;
  onDelete: (record: HomePageContent) => void;
}) {
  const [draft, setDraft] = useState<HomeContentDraft>(emptyDraft);
  const [image, setImage] = useState<File | null>(null);
  const [ratingError, setRatingError] = useState("");
  const [imageError, setImageError] = useState("");
  const [products, setProducts] = useState<ManagedProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState("");
  const [productError, setProductError] = useState("");
  const productLoadId = useRef(0);

  const handleShopChange = (shopId: string) => {
    const loadId = ++productLoadId.current;
    setDraft((current) => ({ ...current, shopId, productId: "" }));
    setProducts([]);
    setProductsError("");
    setProductError("");
    setProductsLoading(Boolean(shopId));
    if (!shopId) return;

    void onLoadShop(Number(shopId))
      .then((shop) => {
        if (loadId !== productLoadId.current) return;
        if (!shop) {
          setProductsError("Products for this shop could not be loaded.");
          return;
        }
        setProducts(
          shop.products.filter(
            (product) =>
              product.isAvailable !== false &&
              Number(product.stockQuantity ?? 0) > 0,
          ),
        );
      })
      .catch((error: unknown) => {
        console.error("Could not load products for promotion card:", error);
        if (loadId === productLoadId.current) {
          setProductsError("Products for this shop could not be loaded.");
        }
      })
      .finally(() => {
        if (loadId === productLoadId.current) setProductsLoading(false);
      });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!image) {
      setImageError("Choose an image to upload.");
      return;
    }
    if (!draft.shopId || !draft.productId) {
      setProductError("Select the shop product customers will be able to buy.");
      return;
    }
    if (!["image/jpeg", "image/png", "image/webp"].includes(image.type) || image.size > 5 * 1024 * 1024) {
      setImageError("Choose a JPG, PNG, or WebP image up to 5 MB.");
      return;
    }
    setProductError("");
    const rating = draft.rating.trim();
    if (rating && (!Number.isFinite(Number(rating)) || Number(rating) < 0 || Number(rating) > 5)) {
      setRatingError("Rating must be between 0 and 5.");
      return;
    }
    setRatingError("");
    setImageError("");
    if (await onCreate(draft, image)) {
      setDraft(emptyDraft);
      setImage(null);
    }
  };

  return (
    <div className="home-content-layout">
      <form className="config-card home-content-form" onSubmit={submit}>
        <div className="panel-heading">
          <div>
            <h3>Create a dashboard card</h3>
            <p>
              Link each card to an in-stock product. Customers see its catalog
              price and can add it to their cart.
            </p>
          </div>
        </div>
        <div className="user-form-grid">
          <label>
            Section
            <select
              value={draft.contentType}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  contentType: event.target.value as HomeContentDraft["contentType"],
                }))
              }
            >
              <option value="promotion">Promotion</option>
              <option value="suggestion">Suggestion</option>
            </select>
          </label>
          <label>
            Card title
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              maxLength={100}
              required
            />
          </label>
          <label>
            Shop product
            <select
              value={draft.shopId}
              onChange={(event) => handleShopChange(event.target.value)}
              required
            >
              <option value="">Choose a shop</option>
              {shops
                .filter((shop) => shop.isOpen === true && shop.isVerified === true)
                .map((shop) => (
                <option key={shop.shopId} value={shop.shopId}>
                  {shop.shopName}
                </option>
                ))}
            </select>
          </label>
          <label>
            Product
            <select
              value={draft.productId}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  productId: event.target.value,
                }))
              }
              disabled={!draft.shopId || productsLoading || products.length === 0}
              required
            >
              <option value="">
                {productsLoading
                  ? "Loading products..."
                  : products.length
                    ? "Choose a product"
                    : "No available products"}
              </option>
              {products.map((product) => (
                <option key={product.productId} value={product.productId}>
                  {product.productName} · GH₵{" "}
                  {Number(product.discountPrice ?? product.price).toFixed(2)}
                </option>
              ))}
            </select>
            {productsError || productError ? (
              <small role="alert">{productsError || productError}</small>
            ) : null}
          </label>
          <label className="user-form-wide">
            Dashboard image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                setImage(event.target.files?.[0] ?? null);
                setImageError("");
              }}
              required
            />
            <small>JPG, PNG, or WebP · maximum 5 MB · stored in AWS S3</small>
            {image ? <small>Selected: {image.name}</small> : null}
            {imageError ? <small role="alert">{imageError}</small> : null}
          </label>
          <label>
            Location <span className="optional-label">Optional</span>
            <input
              value={draft.location}
              onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))}
              maxLength={150}
            />
          </label>
          <label>
            Rating <span className="optional-label">Optional, 0–5</span>
            <input
              type="number"
              min="0"
              max="5"
              step="0.01"
              value={draft.rating}
              onChange={(event) => setDraft((current) => ({ ...current, rating: event.target.value }))}
              aria-invalid={Boolean(ratingError)}
            />
            {ratingError ? <small role="alert">{ratingError}</small> : null}
          </label>
        </div>
        <div className="home-content-submit">
          <button className="button primary" disabled={Boolean(busyKey)}>
            {busyKey === "home-content-upload" ? "Uploading image…" : busyKey === "home-content-create" ? "Saving card…" : "Create card"}
          </button>
        </div>
      </form>

      <div className="record-list">
        {records.length === 0 ? (
          <div className="record-card muted">No promotion or suggestion cards have been created yet.</div>
        ) : (
          records.map((record) => (
            <article className="record-card home-content-record" key={record.homeContentId}>
              <img className="home-content-thumbnail" src={record.imageUrl} alt="" />
              <div className="record-copy">
                <div className="record-title">
                  <h3>{record.title}</h3>
                  <span className={`status-pill ${record.isActive ? "positive" : "neutral"}`}>
                    {record.isActive ? "Published" : "Hidden"}
                  </span>
                  <span className="status-pill neutral">{record.contentType}</span>
                </div>
                <p>
                  {[
                    record.linkedProduct
                      ? `${record.linkedProduct.productName} · GH₵ ${Number(
                          record.linkedProduct.discountPrice ??
                            record.linkedProduct.price,
                        ).toFixed(2)}`
                      : "No shop product linked",
                    record.location,
                    record.rating ? `★ ${record.rating}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "No additional card details"}
                </p>
                <button
                  className="button secondary"
                  disabled={Boolean(busyKey) || !draft.productId}
                  onClick={() =>
                    onLinkProduct(record, Number(draft.productId))
                  }
                >
                  {record.linkedProduct ? "Update linked product" : "Link selected product"}
                </button>
              </div>
              <div className="record-actions">
                <button
                  className="button secondary"
                  disabled={Boolean(busyKey)}
                  onClick={() => onToggle(record)}
                >
                  {busyKey === `home-content-${record.homeContentId}` ? "Saving…" : record.isActive ? "Hide" : "Publish"}
                </button>
                <button
                  className="button danger-outline"
                  disabled={Boolean(busyKey)}
                  onClick={() => onDelete(record)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
