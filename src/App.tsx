import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import HomeContentSection, {
  type HomeContentDraft,
  type HomePageContent,
} from "./HomeContentSection";
import ShopManagementSection, {
  type ManagedProduct,
  type ManagedShop,
  type ManagedShopDetails,
  type ProductDraft,
  type ShopDraft,
} from "./ShopManagementSection";
import "./App.css";

type AdminUser = {
  userId: number;
  userType: string;
  email: string;
  fullName: string | null;
};

type Rider = {
  riderId: number;
  userId: number;
  vehicleType: string;
  vehicleModel: string | null;
  vehicleColor: string | null;
  vehiclePlateNumber: string | null;
  licenseNumber: string | null;
  idCardImage: string | null;
  driverLicenseImage: string | null;
  vehicleRegistrationImage: string | null;
  insuranceImage: string | null;
  isAvailable: boolean;
  isApproved: boolean;
  bankName: string | null;
};

type RiderDocument = {
  documentId: number;
  documentType: string;
  contentType: string;
  fileSize: number;
  url: string;
};

type Account = {
  userId: number;
  fullName: string | null;
  email: string;
  phoneNumber: string | null;
  userType: string;
  isActive: boolean;
};

type NewAccount = {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  userType: "customer" | "rider" | "admin";
};

type AccountUpdate = Pick<Account, "fullName" | "email" | "phoneNumber" | "isActive">;

type RiderUpdate = Pick<
  Rider,
  "vehicleType" | "vehicleModel" | "vehicleColor" | "vehiclePlateNumber" | "licenseNumber"
>;

type Order = {
  orderId: number;
  orderReference: string;
  orderType: string;
  shopId: number;
  shopName?: string;
  items?: {
    orderItemId: number;
    productName: string;
    quantity: number;
    lineTotal: string | number;
  }[];
  riderId: number | null;
  status: string;
  totalAmount: string | number;
  paymentStatus: string;
  paymentMethod: string;
  orderPlacedAt: string;
  userId: number;
};

type Delivery = {
  deliveryId: number;
  deliveryReference: string;
  deliveryType: string;
  status: string;
  senderId: number;
  riderId: number | null;
  pickupAddress: string;
  dropoffAddress: string;
  recipientName: string;
  totalAmount: string | number;
  paymentStatus: string;
  createdAt: string;
};

type Ride = {
  rideId: number;
  rideReference: string;
  rideType: string;
  bookingType: string;
  userId: number;
  passengerName: string | null;
  passengerEmail: string;
  passengerPhone: string | null;
  riderId: number | null;
  pickupAddress: string;
  dropoffAddress: string;
  estimatedDistance: string | number | null;
  estimatedPrice: string | number | null;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  bookedAt: string | null;
};

type PricingRates = {
  deliveryPerKm: string;
  ridePerKm: string;
};

type Ticket = {
  ticketId: number;
  userId: number;
  subject: string;
  message: string;
  category: string;
  priority: string;
  status: string;
  assignedTo: number | null;
  contactMethod: string | null;
  createdAt: string;
};

type SystemConfig = {
  configId: number;
  configKey: string;
  configValue: string | null;
  configGroup: string | null;
  description: string | null;
  isEditable: boolean;
};

type Section =
  | "overview"
  | "riders"
  | "orders"
  | "deliveries"
  | "rides"
  | "support"
  | "users"
  | "config"
  | "pricing"
  | "home-content"
  | "shops";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = (
  configuredApiBaseUrl ||
  (import.meta.env.DEV ? "http://localhost:4000/api" : "")
).replace(/\/$/, "");

async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error(
      "VITE_API_BASE_URL is not configured for this admin deployment.",
    );
  }
  const method = options.method || "GET";
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(
      `Could not connect to ${API_BASE_URL}${path} (${method}). Check the backend URL and that the server is running.`,
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | { message?: string; user?: AdminUser; data?: T }
    | null;
  if (!response.ok) {
    throw new Error(
      payload?.message ||
        `${method} ${path} returned HTTP ${response.status} from ${API_BASE_URL}.`,
    );
  }
  return payload as T;
}

function readData<T>(result: { data: T }) {
  return result.data;
}

function date(value: string | null | undefined) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString();
}

function money(value: string | number) {
  return `GHS ${Number(value || 0).toFixed(2)}`;
}

function titleCase(value: string | null | undefined) {
  return (value || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function App() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [section, setSection] = useState<Section>("overview");
  const [riders, setRiders] = useState<Rider[]>([]);
  const [users, setUsers] = useState<Account[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [homeContent, setHomeContent] = useState<HomePageContent[]>([]);
  const [shops, setShops] = useState<ManagedShop[]>([]);
  const [pricingRates, setPricingRates] = useState<PricingRates>({
    deliveryPerKm: "2.50",
    ridePerKm: "2.50",
  });
  const [pricingDrafts, setPricingDrafts] = useState<PricingRates>({
    deliveryPerKm: "2.50",
    ridePerKm: "2.50",
  });
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");
  const [dataNotice, setDataNotice] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [configDrafts, setConfigDrafts] = useState<Record<string, string>>({});

  const loadAdminData = useCallback(async () => {
    setLoadingData(true);
    setDataError("");
    try {
      const [
        riderResponse,
        userResponse,
        orderResponse,
        deliveryResponse,
        rideResponse,
        ticketResponse,
        configResponse,
        pricingResponse,
        homeContentResponse,
        shopResponse,
      ] =
        await Promise.all([
          apiRequest<{ data: Rider[] }>("/riders?limit=200"),
          apiRequest<{ data: Account[] }>("/users?limit=200"),
          apiRequest<{ data: Order[] }>("/admin/orders?limit=200"),
          apiRequest<{ data: Delivery[] }>("/admin/deliveries?limit=200"),
          apiRequest<{ data: Ride[] }>("/admin/rides?limit=200"),
          apiRequest<{ data: Ticket[] }>("/admin/support-tickets?limit=200"),
          apiRequest<{ data: SystemConfig[] }>("/system-config"),
          apiRequest<{ data: PricingRates }>("/admin/pricing-rates"),
          apiRequest<{ data: HomePageContent[] }>("/admin/home-page-content"),
          apiRequest<{ data: ManagedShop[] }>("/shops?limit=500"),
        ]);
      setRiders(readData(riderResponse));
      setUsers(readData(userResponse));
      setOrders(readData(orderResponse));
      setDeliveries(readData(deliveryResponse));
      setRides(readData(rideResponse));
      setTickets(readData(ticketResponse));
      const nextPricingRates = readData(pricingResponse);
      setPricingRates(nextPricingRates);
      setPricingDrafts(nextPricingRates);
      const nextConfigs = readData(configResponse);
      setConfigs(nextConfigs);
      setHomeContent(readData(homeContentResponse));
      setShops(readData(shopResponse));
      setConfigDrafts(
        Object.fromEntries(
          nextConfigs.map((item) => [item.configKey, item.configValue ?? ""]),
        ),
      );
    } catch (error) {
      setDataError(
        error instanceof Error ? error.message : "Could not load admin data.",
      );
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void apiRequest<{ user: AdminUser }>("/auth/me")
      .then((result) => {
        if (!active) return;
        if (result.user?.userType === "admin") {
          setUser(result.user);
        } else {
          setLoginError("This web application is only available to admin accounts.");
          void apiRequest("/auth/logout", { method: "POST" }).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (user) void loadAdminData();
  }, [user, loadAdminData]);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const result = await apiRequest<{ user: AdminUser }>("/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (result.user?.userType !== "admin") {
        await apiRequest("/auth/logout", { method: "POST" }).catch(() => {});
        throw new Error("This web application is only available to admin accounts.");
      }
      setUser(result.user);
      setPassword("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Sign-in failed.");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Could not sign out.");
      return;
    }
    setUser(null);
    setRiders([]);
    setUsers([]);
    setOrders([]);
    setDeliveries([]);
    setRides([]);
    setTickets([]);
    setConfigs([]);
    setHomeContent([]);
    setShops([]);
  };

  const perform = async (key: string, operation: () => Promise<void>) => {
    if (busyKey) return;
    setBusyKey(key);
    setDataError("");
    try {
      await operation();
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "The action failed.");
    } finally {
      setBusyKey(null);
    }
  };

  const runShopAction = async <T,>(
    key: string,
    operation: () => Promise<T>,
  ): Promise<T | null> => {
    if (busyKey) return null;
    setBusyKey(key);
    setDataError("");
    setDataNotice("");
    try {
      return await operation();
    } catch (error) {
      setDataError(
        error instanceof Error ? error.message : "The shop management action failed.",
      );
      return null;
    } finally {
      setBusyKey(null);
    }
  };

  const createShop = (draft: ShopDraft) =>
    runShopAction("shop-create", async () => {
      const result = await apiRequest<{ data: ManagedShop }>("/shops", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      const created = readData(result);
      setShops((current) => [created, ...current]);
      setDataNotice(
        `Created shop "${created.shopName}". Verify it and mark it open to show it in the customer app.`,
      );
      return created;
    });

  const updateShop = (shopId: number, draft: ShopDraft) =>
    runShopAction(`shop-${shopId}`, async () => {
      const result = await apiRequest<{ data: ManagedShop }>(`/shops/${shopId}`, {
        method: "PATCH",
        body: JSON.stringify(draft),
      });
      const updated = readData(result);
      setShops((current) =>
        current.map((shop) => (shop.shopId === shopId ? updated : shop)),
      );
      setDataNotice(`Updated shop "${updated.shopName}".`);
      return updated;
    });

  const deleteShop = (shop: ManagedShop) =>
    runShopAction(`shop-${shop.shopId}`, async () => {
      await apiRequest(`/shops/${shop.shopId}`, { method: "DELETE" });
      setShops((current) =>
        current.filter((item) => item.shopId !== shop.shopId),
      );
      setDataNotice(`Deleted shop "${shop.shopName}".`);
      return true;
    }).then((result) => result === true);

  const loadShop = async (shopId: number) => {
    try {
      const result = await apiRequest<{ data: ManagedShopDetails }>(
        `/shops/${shopId}`,
      );
      return readData(result);
    } catch (error) {
      console.error(`Could not load products for shop ${shopId}:`, error);
      return null;
    }
  };

  const createProduct = (shopId: number, draft: ProductDraft) =>
    runShopAction(`product-create-${shopId}`, async () => {
      const result = await apiRequest<{ data: ManagedProduct }>("/products", {
        method: "POST",
        body: JSON.stringify({ shopId, ...draft }),
      });
      const created = readData(result);
      setDataNotice(`Added "${created.productName}" to the shop catalog.`);
      return created;
    });

  const updateProduct = (productId: number, draft: ProductDraft) =>
    runShopAction(`product-${productId}`, async () => {
      const result = await apiRequest<{ data: ManagedProduct }>(
        `/products/${productId}`,
        {
          method: "PATCH",
          body: JSON.stringify(draft),
        },
      );
      const updated = readData(result);
      setDataNotice(`Updated product "${updated.productName}".`);
      return updated;
    });

  const deleteProduct = (product: ManagedProduct) =>
    runShopAction(`product-${product.productId}`, async () => {
      await apiRequest(`/products/${product.productId}`, { method: "DELETE" });
      setDataNotice(`Deleted product "${product.productName}".`);
      return true;
    }).then((result) => result === true);

  const uploadShopImage = (image: File) =>
    runShopAction("shop-image-upload", async () => {
      const result = await apiRequest<{ data: { key: string } }>(
        "/admin/shop-images/upload",
        {
          method: "POST",
          headers: { "Content-Type": image.type },
          body: image,
        },
      );
      return readData(result).key;
    });

  const createHomeContent = async (draft: HomeContentDraft, image: File) => {
    if (busyKey) return false;
    setBusyKey("home-content-upload");
    setDataError("");
    setDataNotice("");
    try {
      const uploadResult = await apiRequest<{
        data: { key: string };
      }>("/admin/home-page-content/upload", {
        method: "POST",
        headers: { "Content-Type": image.type },
        body: image,
      });
      const { key } = readData(uploadResult);

      setBusyKey("home-content-create");
      const result = await apiRequest<{ data: HomePageContent }>(
        "/admin/home-page-content",
        {
          method: "POST",
          body: JSON.stringify({
            ...draft,
            productId: Number(draft.productId),
            rating: draft.rating.trim() || null,
            imageUrl: key,
          }),
        },
      );
      const created = readData(result);
      setHomeContent((current) => [...current, created]);
      setDataNotice(`Created ${created.contentType} card "${created.title}".`);
      return true;
    } catch (error) {
      setDataError(
        error instanceof Error ? error.message : "Could not create the dashboard card.",
      );
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const toggleHomeContent = (record: HomePageContent) => {
    void perform(`home-content-${record.homeContentId}`, async () => {
      const result = await apiRequest<{ data: HomePageContent }>(
        `/admin/home-page-content/${record.homeContentId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: !record.isActive }),
        },
      );
      const updated = readData(result);
      setHomeContent((current) =>
        current.map((item) =>
          item.homeContentId === updated.homeContentId ? updated : item,
        ),
      );
      setDataNotice(
        `${updated.contentType} card "${updated.title}" ${updated.isActive ? "published" : "hidden"}.`,
      );
    });
  };

  const linkHomeContentProduct = (
    record: HomePageContent,
    productId: number,
  ) => {
    void perform(`home-content-${record.homeContentId}`, async () => {
      const result = await apiRequest<{ data: HomePageContent }>(
        `/admin/home-page-content/${record.homeContentId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ productId }),
        },
      );
      const updated = readData(result);
      setHomeContent((current) =>
        current.map((item) =>
          item.homeContentId === updated.homeContentId ? updated : item,
        ),
      );
      setDataNotice(
        `Linked "${updated.title}" to ${updated.linkedProduct?.productName ?? "the selected product"}.`,
      );
    });
  };

  const deleteHomeContent = (record: HomePageContent) => {
    if (
      !window.confirm(
        `Permanently delete the ${record.contentType} card "${record.title}"?`,
      )
    ) {
      return;
    }
    void perform(`home-content-${record.homeContentId}`, async () => {
      const result = await apiRequest<{ warning?: string }>(
        `/admin/home-page-content/${record.homeContentId}`,
        { method: "DELETE" },
      );
      setHomeContent((current) =>
        current.filter((item) => item.homeContentId !== record.homeContentId),
      );
      setDataNotice(
        result.warning ||
          `Deleted ${record.contentType} card "${record.title}".`,
      );
    });
  };

  const updateRiderReview = async (
    rider: Rider,
    isApproved: boolean,
    reviewedDocumentIds?: number[],
  ) => {
    if (busyKey) return false;
    setBusyKey(`rider-${rider.riderId}`);
    setDataError("");
    try {
      await apiRequest(`/riders/${rider.riderId}/review`, {
        method: "PATCH",
        body: JSON.stringify({
          isApproved,
          ...(isApproved ? { reviewedDocumentIds } : {}),
        }),
      });
      setRiders((current) =>
        current.map((item) =>
          item.riderId === rider.riderId
            ? {
                ...item,
                isApproved,
                isAvailable: isApproved ? item.isAvailable : false,
              }
            : item,
        ),
      );
      return true;
    } catch (error) {
      setDataError(
        error instanceof Error ? error.message : "Could not update the rider application.",
      );
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  const createUser = async (account: NewAccount) => {
    if (busyKey) return "Another action is still in progress.";
    setBusyKey("user-create");
    setDataError("");
    setDataNotice("");
    try {
      const result = await apiRequest<{ data: Account }>("/users/admin", {
        method: "POST",
        body: JSON.stringify(account),
      });
      const created = readData(result);
      setUsers((current) => [created, ...current]);
      setDataNotice(`Created ${created.userType} account for ${created.email}.`);
      return null;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not create the account.";
      setDataError(message);
      return message;
    } finally {
      setBusyKey(null);
    }
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    await perform(`order-${orderId}`, async () => {
      await apiRequest(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setOrders((current) =>
        current.map((order) => (order.orderId === orderId ? { ...order, status } : order)),
      );
    });
  };

  const assignOrderRider = async (orderId: number, riderId: number | null) => {
    await perform(`order-${orderId}`, async () => {
      await apiRequest(`/orders/${orderId}/assign-rider`, {
        method: "PATCH",
        body: JSON.stringify({ riderId }),
      });
      setOrders((current) =>
        current.map((order) =>
          order.orderId === orderId ? { ...order, riderId } : order,
        ),
      );
    });
  };

  const updateDeliveryStatus = async (deliveryId: number, status: string) => {
    await perform(`delivery-${deliveryId}`, async () => {
      const result = await apiRequest<{ data: Delivery }>(
        `/deliveries/${deliveryId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      );
      const updated = readData(result);
      setDeliveries((current) =>
        current.map((delivery) =>
          delivery.deliveryId === deliveryId
            ? {
                ...delivery,
                status: updated.status,
                paymentStatus: updated.paymentStatus,
              }
            : delivery,
        ),
      );
    });
  };

  const updateRideStatus = async (rideId: number, status: string) => {
    await perform(`ride-${rideId}`, async () => {
      const result = await apiRequest<{ data: Ride }>(`/rides/${rideId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const updated = readData(result);
      setRides((current) =>
        current.map((ride) =>
          ride.rideId === rideId ? { ...ride, status: updated.status } : ride,
        ),
      );
    });
  };

  const assignDeliveryRider = async (
    deliveryId: number,
    riderId: number | null,
  ) => {
    await perform(`delivery-${deliveryId}`, async () => {
      await apiRequest(`/deliveries/${deliveryId}/assign-rider`, {
        method: "PATCH",
        body: JSON.stringify({ riderId }),
      });
      setDeliveries((current) =>
        current.map((delivery) =>
          delivery.deliveryId === deliveryId ? { ...delivery, riderId } : delivery,
        ),
      );
    });
  };

  const updateAccount = async (userId: number, updates: AccountUpdate) => {
    await perform(`user-${userId}`, async () => {
      const result = await apiRequest<{ data: Account }>(`/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({
          ...updates,
          userType: users.find((account) => account.userId === userId)?.userType,
        }),
      });
      const responseAccount = readData(result);
      const updated: Account = {
        userId: responseAccount.userId,
        fullName: responseAccount.fullName,
        email: responseAccount.email,
        phoneNumber: responseAccount.phoneNumber,
        userType: responseAccount.userType,
        isActive: responseAccount.isActive,
      };
      setUsers((current) =>
        current.map((account) => (account.userId === userId ? updated : account)),
      );
      if (user?.userId === userId) setUser(updated);
    });
  };

  const updateRider = async (riderId: number, updates: RiderUpdate) => {
    await perform(`rider-${riderId}`, async () => {
      const result = await apiRequest<{ data: Rider }>(`/riders/${riderId}/admin`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
      const updated = readData(result);
      setRiders((current) =>
        current.map((rider) => (rider.riderId === riderId ? { ...rider, ...updated } : rider)),
      );
    });
  };

  const removeRecord = async (
    busyKey: string,
    path: string,
    onSuccess: () => void,
  ) => {
    await perform(busyKey, async () => {
      await apiRequest(path, { method: "DELETE" });
      onSuccess();
    });
  };

  const deleteAccount = async (account: Account) => {
    await removeRecord(`user-${account.userId}`, `/users/${account.userId}`, () => {
      setUsers((current) =>
        current.filter((item) => item.userId !== account.userId),
      );
      setRiders((current) => current.filter((item) => item.userId !== account.userId));
      setTickets((current) =>
        current
          .filter((ticket) => ticket.userId !== account.userId)
          .map((ticket) =>
            ticket.assignedTo === account.userId
              ? { ...ticket, assignedTo: null }
              : ticket,
          ),
      );
    });
  };

  const deleteOrder = async (orderId: number) => {
    await removeRecord(`order-${orderId}`, `/orders/${orderId}`, () => {
      setOrders((current) => current.filter((item) => item.orderId !== orderId));
    });
  };

  const deleteDelivery = async (deliveryId: number) => {
    await removeRecord(`delivery-${deliveryId}`, `/deliveries/${deliveryId}`, () => {
      setDeliveries((current) =>
        current.filter((item) => item.deliveryId !== deliveryId),
      );
    });
  };

  const deleteTicket = async (ticketId: number) => {
    await removeRecord(`ticket-${ticketId}`, `/support-tickets/${ticketId}`, () => {
      setTickets((current) => current.filter((item) => item.ticketId !== ticketId));
    });
  };

  const updateTicket = async (
    ticketId: number,
    updates: { status?: string; priority?: string; assignedTo?: number | null },
  ) => {
    await perform(`ticket-${ticketId}`, async () => {
      await apiRequest(`/support-tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      setTickets((current) =>
        current.map((ticket) =>
          ticket.ticketId === ticketId ? { ...ticket, ...updates } : ticket,
        ),
      );
    });
  };

  const updateConfig = async (config: SystemConfig) => {
    await perform(`config-${config.configKey}`, async () => {
      const configValue = configDrafts[config.configKey] ?? "";
      await apiRequest(`/system-config/${encodeURIComponent(config.configKey)}`, {
        method: "PUT",
        body: JSON.stringify({ configValue }),
      });
      setConfigs((current) =>
        current.map((item) =>
          item.configKey === config.configKey ? { ...item, configValue } : item,
        ),
      );
    });
  };

  const updatePricingRates = async () => {
    await perform("pricing-rates", async () => {
      const result = await apiRequest<{ data: PricingRates }>(
        "/admin/pricing-rates",
        {
          method: "PUT",
          body: JSON.stringify(pricingDrafts),
        },
      );
      const updatedRates = readData(result);
      setPricingRates(updatedRates);
      setPricingDrafts(updatedRates);
      setDataNotice("Per-kilometer prices updated.");
    });
  };

  const userById = useMemo(
    () => new Map(users.map((account) => [account.userId, account])),
    [users],
  );
  const search = query.trim().toLowerCase();
  const filteredRiders = riders.filter((rider) => {
    const account = userById.get(rider.userId);
    return `${account?.fullName ?? ""} ${account?.email ?? ""} ${rider.vehiclePlateNumber ?? ""} ${rider.vehicleType}`
      .toLowerCase()
      .includes(search);
  });
  const filteredOrders = orders.filter((order) =>
    `${order.orderReference} ${order.orderType} ${order.status}`
      .toLowerCase()
      .includes(search),
  );
  const filteredRides = rides.filter((ride) => {
    const passenger = userById.get(ride.userId);
    return `${ride.rideReference} ${ride.rideType} ${ride.bookingType} ${ride.status} ${ride.paymentStatus} ${ride.paymentMethod} ${ride.passengerName ?? passenger?.fullName ?? ""} ${ride.passengerEmail} ${ride.passengerPhone ?? passenger?.phoneNumber ?? ""} ${ride.riderId ?? ""} ${ride.pickupAddress} ${ride.dropoffAddress}`
      .toLowerCase()
      .includes(search);
  });
  const filteredDeliveries = deliveries.filter((delivery) =>
    `${delivery.deliveryReference} ${delivery.deliveryType} ${delivery.status} ${delivery.recipientName} ${delivery.senderId} ${delivery.riderId ?? ""} ${delivery.pickupAddress} ${delivery.dropoffAddress}`
      .toLowerCase()
      .includes(search),
  );
  const filteredTickets = tickets.filter((ticket) =>
    `${ticket.subject} ${ticket.category} ${ticket.status}`
      .toLowerCase()
      .includes(search),
  );
  const filteredUsers = users.filter((account) =>
    `${account.fullName ?? ""} ${account.email} ${account.userType}`
      .toLowerCase()
      .includes(search),
  );

  if (checkingSession) {
    return (
      <main className="auth-screen">
        <div className="auth-card">
          <div className="brand-mark">N</div>
          <p className="eyebrow">NORTHRIDE ADMIN</p>
          <h1>Checking your session</h1>
          <div className="loader" aria-label="Loading" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-screen">
        <form className="auth-card" onSubmit={handleLogin}>
          <div className="brand-mark">N</div>
          <p className="eyebrow">NORTHRIDE ADMIN</p>
          <h1>Sign in to your workspace</h1>
          <p className="muted">
            Use your verified administrator account to manage NorthRide.
          </p>
          {loginError ? <div className="alert error">{loginError}</div> : null}
          <label>
            Admin email
            <input
              autoComplete="username"
              autoCapitalize="none"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </label>
          <button className="button primary full-width" disabled={loginBusy}>
            {loginBusy ? "Signing in…" : "Sign in securely"}
          </button>
          <p className="auth-footnote">
            Admin-only access · Session secured by the NorthRide backend
          </p>
        </form>
      </main>
    );
  }

  const navItems: { key: Section; label: string; icon: string }[] = [
    { key: "overview", label: "Overview", icon: "◫" },
    { key: "riders", label: "Rider applications", icon: "↗" },
    { key: "orders", label: "Orders", icon: "▤" },
    { key: "deliveries", label: "Deliveries", icon: "⇢" },
    { key: "rides", label: "Rides", icon: "↗" },
    { key: "support", label: "Support", icon: "?" },
    { key: "users", label: "Users", icon: "◎" },
    { key: "config", label: "System settings", icon: "⚙" },
    { key: "pricing", label: "Pricing", icon: "₵" },
    { key: "home-content", label: "Home promotions", icon: "★" },
    { key: "shops", label: "Shop management", icon: "▣" },
  ];

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark small">N</div>
          <div>
            <strong>NorthRide</strong>
            <span>ADMIN CONSOLE</span>
          </div>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav>
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${section === item.key ? "active" : ""}`}
              onClick={() => {
                setSection(item.key);
                setQuery("");
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
              {item.key === "riders" && riders.some((rider) => !rider.isApproved) ? (
                <span className="nav-count">
                  {riders.filter((rider) => !rider.isApproved).length}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="admin-identity">
            <div className="avatar">{(user.fullName || user.email).slice(0, 1).toUpperCase()}</div>
            <div className="identity-text">
              <strong>{user.fullName || "Administrator"}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <button className="nav-item signout" onClick={() => void handleLogout()}>
            <span className="nav-icon">↪</span>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div>
            <p className="eyebrow">ADMIN WORKSPACE</p>
            <h1>{navItems.find((item) => item.key === section)?.label}</h1>
          </div>
          <div className="topbar-actions">
            <span className="secure-badge"><span /> Secure session</span>
            <button
              className="button secondary"
              onClick={() => void loadAdminData()}
              disabled={loadingData}
            >
              {loadingData ? "Refreshing…" : "↻ Refresh"}
            </button>
          </div>
        </header>

        <section className="content">
          {dataError ? (
            <div className="alert error" role="alert">
              <span>{dataError}</span>
              <button onClick={() => void loadAdminData()}>Retry</button>
            </div>
          ) : null}
          {dataNotice ? (
            <div className="alert success" role="status">{dataNotice}</div>
          ) : null}

          {section !== "overview" ? (
            <div className="list-toolbar">
              <div>
                <strong>
                  {sectionHeading(
                    section,
                    riders,
                    orders,
                    deliveries,
                    rides,
                    tickets,
                    users,
                    configs,
                    homeContent,
                    shops,
                  )}
                </strong>
                <span>Review and manage NorthRide operations</span>
              </div>
              {["riders", "orders", "deliveries", "rides", "support", "users"].includes(section) ? (
                <input
                  className="search-input"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search records"
                  aria-label="Search records"
                />
              ) : null}
            </div>
          ) : null}

          {section === "overview" ? (
            <Overview
              riders={riders}
              orders={orders}
              rides={rides}
              tickets={tickets}
              loading={loadingData}
              onGo={setSection}
            />
          ) : null}

          {section === "rides" ? (
            <RidesSection
              rides={filteredRides}
              users={userById}
              riders={riders}
              busyKey={busyKey}
              onStatus={updateRideStatus}
            />
          ) : null}

          {section === "riders" ? (
            <RidersSection
              riders={filteredRiders}
              users={userById}
              busyKey={busyKey}
              onReview={updateRiderReview}
              onUpdate={updateRider}
              onDelete={(rider) => {
                const account = userById.get(rider.userId);
                if (!account) {
                  setDataError("Could not find the rider's account record.");
                } else if (window.confirm(
                  `Permanently delete ${account.fullName || account.email}'s account and rider profile?`,
                )) {
                  void deleteAccount(account);
                }
              }}
            />
          ) : null}

          {section === "orders" ? (
            <OrdersSection
              orders={filteredOrders}
              riders={riders}
              busyKey={busyKey}
              onStatus={updateOrderStatus}
              onAssign={assignOrderRider}
              onDelete={(order) => {
                if (
                  window.confirm(
                    `Permanently delete ${order.orderReference}? Only unassigned, pending, unpaid orders can be deleted.`,
                  )
                ) {
                  void deleteOrder(order.orderId);
                }
              }}
            />
          ) : null}

          {section === "deliveries" ? (
            <DeliveriesSection
              deliveries={filteredDeliveries}
              riders={riders}
              busyKey={busyKey}
              onStatus={updateDeliveryStatus}
              onAssign={assignDeliveryRider}
              onDelete={(delivery) => {
                if (
                  window.confirm(
                    `Permanently delete ${delivery.deliveryReference}? Only unassigned, pending, unpaid deliveries can be deleted.`,
                  )
                ) {
                  void deleteDelivery(delivery.deliveryId);
                }
              }}
            />
          ) : null}

          {section === "support" ? (
            <SupportSection
              tickets={filteredTickets}
              users={userById}
              busyKey={busyKey}
              onUpdate={updateTicket}
              onDelete={(ticket) => {
                if (window.confirm(`Permanently delete ticket "${ticket.subject}"?`)) {
                  void deleteTicket(ticket.ticketId);
                }
              }}
            />
          ) : null}

          {section === "users" ? (
            <UsersSection
              users={filteredUsers}
              busyKey={busyKey}
              onCreate={createUser}
              currentUserId={user.userId}
              onUpdate={updateAccount}
              onDelete={(account) => {
                if (
                  window.confirm(
                    `Permanently delete ${account.fullName || account.email}'s account and related records?`,
                  )
                ) {
                  void deleteAccount(account);
                }
              }}
            />
          ) : null}

          {section === "config" ? (
            <ConfigSection
              configs={configs.filter(
                (item) =>
                  item.configKey !== "delivery_per_km" &&
                  item.configKey !== "ride_per_km",
              )}
              drafts={configDrafts}
              busyKey={busyKey}
              onDraft={(key, value) =>
                setConfigDrafts((current) => ({ ...current, [key]: value }))
              }
              onSave={updateConfig}
            />
          ) : null}
          {section === "pricing" ? (
            <PricingSection
              rates={pricingRates}
              drafts={pricingDrafts}
              busy={busyKey === "pricing-rates"}
              onDraft={(key, value) =>
                setPricingDrafts((current) => ({ ...current, [key]: value }))
              }
              onSave={updatePricingRates}
            />
          ) : null}
          {section === "home-content" ? (
            <HomeContentSection
              records={homeContent}
              shops={shops}
              busyKey={busyKey}
              onCreate={createHomeContent}
              onLoadShop={loadShop}
              onLinkProduct={linkHomeContentProduct}
              onToggle={toggleHomeContent}
              onDelete={deleteHomeContent}
            />
          ) : null}
          {section === "shops" ? (
            <ShopManagementSection
              shops={shops}
              owners={users}
              busyKey={busyKey}
              onCreateShop={createShop}
              onUpdateShop={updateShop}
              onDeleteShop={deleteShop}
              onLoadShop={loadShop}
              onCreateProduct={createProduct}
              onUpdateProduct={updateProduct}
              onDeleteProduct={deleteProduct}
              onUploadImage={uploadShopImage}
            />
          ) : null}
        </section>
        <footer className="footer">
          <span>NorthRide operations</span>
          <span>Admin actions are protected and recorded by the backend.</span>
        </footer>
      </main>
    </div>
  );
}

function sectionHeading(
  section: Section,
  riders: Rider[],
  orders: Order[],
  deliveries: Delivery[],
  rides: Ride[],
  tickets: Ticket[],
  users: Account[],
  configs: SystemConfig[],
  homeContent: HomePageContent[],
  shops: ManagedShop[],
) {
  switch (section) {
    case "riders":
      return `${riders.length} riders`;
    case "orders":
      return `${orders.length} orders`;
    case "deliveries":
      return `${deliveries.length} deliveries`;
    case "rides":
      return `${rides.length} rides`;
    case "support":
      return `${tickets.length} support tickets`;
    case "users":
      return `${users.length} accounts`;
    case "config":
      return `${configs.length} configuration items`;
    case "pricing":
      return "Ride and delivery rates";
    case "home-content":
      return `${homeContent.length} dashboard cards`;
    case "shops":
      return `${shops.length} shops`;
    default:
      return "";
  }
}

function Overview({
  riders,
  orders,
  rides,
  tickets,
  loading,
  onGo,
}: {
  riders: Rider[];
  orders: Order[];
  rides: Ride[];
  tickets: Ticket[];
  loading: boolean;
  onGo: (section: Section) => void;
}) {
  const pendingRiders = riders.filter((rider) => !rider.isApproved).length;
  const openTickets = tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status)).length;
  const activeOrders = orders.filter((order) =>
    ["pending", "confirmed", "preparing", "ready", "picked_up", "in_transit"].includes(order.status),
  ).length;
  const activeRides = rides.filter((ride) =>
    ["pending", "searching", "confirmed", "arrived", "in_progress"].includes(ride.status),
  ).length;

  return (
    <>
      <div className="welcome-panel">
        <div>
          <span className="welcome-tag">OPERATIONS SUMMARY</span>
          <h2>Welcome to NorthRide Admin</h2>
          <p>Review rider applications and keep the service running smoothly.</p>
        </div>
        <div className="welcome-art">NR<span>+</span></div>
      </div>
      {loading ? (
        <div className="loading-panel"><div className="loader" />Loading operations data…</div>
      ) : (
        <>
          <div className="metric-grid">
            <Metric label="Total riders" value={riders.length} icon="↗" tone="green" />
            <Metric label="Awaiting review" value={pendingRiders} icon="◷" tone="amber" />
            <Metric label="Active orders" value={activeOrders} icon="▤" tone="blue" />
            <Metric label="Active rides" value={activeRides} icon="↗" tone="purple" />
            <Metric label="Open support" value={openTickets} icon="?" tone="purple" />
          </div>
          <div className="overview-grid">
            <div className="panel">
              <div className="panel-heading">
                <div><h3>Needs attention</h3><p>Items that may need an admin action</p></div>
              </div>
              {pendingRiders || openTickets ? (
                <div className="attention-list">
                  {pendingRiders ? (
                    <button onClick={() => onGo("riders")} className="attention-row">
                      <span className="attention-icon amber">↗</span>
                      <span><strong>{pendingRiders} rider application{pendingRiders === 1 ? "" : "s"}</strong><small>Review submitted documents and approve eligible riders.</small></span>
                      <b>›</b>
                    </button>
                  ) : null}
                  {openTickets ? (
                    <button onClick={() => onGo("support")} className="attention-row">
                      <span className="attention-icon purple">?</span>
                      <span><strong>{openTickets} open support ticket{openTickets === 1 ? "" : "s"}</strong><small>Respond to customer and rider requests.</small></span>
                      <b>›</b>
                    </button>
                  ) : null}
                </div>
              ) : (
                <div className="empty-state compact"><span>✓</span><strong>All caught up</strong><p>No pending applications or open tickets.</p></div>
              )}
            </div>
            <div className="panel shortcuts">
              <div className="panel-heading"><div><h3>Quick access</h3><p>Frequently used operations</p></div></div>
              <button onClick={() => onGo("riders")} className="shortcut-row"><span>Review riders</span><b>›</b></button>
              <button onClick={() => onGo("orders")} className="shortcut-row"><span>Manage orders</span><b>›</b></button>
              <button onClick={() => onGo("rides")} className="shortcut-row"><span>Manage rides</span><b>›</b></button>
              <button onClick={() => onGo("pricing")} className="shortcut-row"><span>Set service prices</span><b>›</b></button>
              <button onClick={() => onGo("support")} className="shortcut-row"><span>Support queue</span><b>›</b></button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Metric({ label, value, icon, tone }: { label: string; value: number; icon: string; tone: string }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}

function RidersSection({
  riders,
  users,
  busyKey,
  onReview,
  onUpdate,
  onDelete,
}: {
  riders: Rider[];
  users: Map<number, Account>;
  busyKey: string | null;
  onReview: (
    rider: Rider,
    approved: boolean,
    reviewedDocumentIds?: number[],
  ) => Promise<boolean>;
  onUpdate: (riderId: number, updates: RiderUpdate) => Promise<void>;
  onDelete: (rider: Rider) => void;
}) {
  const [activeRider, setActiveRider] = useState<Rider | null>(null);
  const [editingRider, setEditingRider] = useState<Rider | null>(null);
  const [riderDraft, setRiderDraft] = useState<RiderUpdate | null>(null);
  const [documents, setDocuments] = useState<RiderDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState("");
  const [confirmedReview, setConfirmedReview] = useState(false);
  const [loadedDocumentIds, setLoadedDocumentIds] = useState<Set<number>>(
    () => new Set(),
  );
  const [failedDocumentIds, setFailedDocumentIds] = useState<Set<number>>(
    () => new Set(),
  );
  const documentRequest = useRef(0);
  const [reviewedRiders, setReviewedRiders] = useState<Map<number, number[]>>(
    () => new Map(),
  );

  const openDocuments = async (rider: Rider) => {
    const requestId = ++documentRequest.current;
    setActiveRider(rider);
    setDocuments([]);
    setDocumentsError("");
    setConfirmedReview(false);
    setLoadedDocumentIds(new Set());
    setFailedDocumentIds(new Set());
    setDocumentsLoading(true);
    try {
      const result = await apiRequest<{ data: RiderDocument[] }>(
        `/riders/${rider.riderId}/documents`,
      );
      if (requestId !== documentRequest.current) return;
      setDocuments(readData(result));
    } catch (error) {
      if (requestId !== documentRequest.current) return;
      setDocumentsError(
        error instanceof Error ? error.message : "Could not load rider documents.",
      );
    } finally {
      if (requestId === documentRequest.current) setDocumentsLoading(false);
    }
  };

  const closeDocuments = () => {
    documentRequest.current += 1;
    setDocumentsLoading(false);
    const previewsReady =
      documents.length === 6 &&
      documents.every((document) => loadedDocumentIds.has(document.documentId));
    if (confirmedReview && previewsReady && activeRider) {
      setReviewedRiders(
        (current) =>
          new Map(current).set(
            activeRider.riderId,
            documents.map((document) => document.documentId),
          ),
      );
    }
    setActiveRider(null);
  };

  const saveRider = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingRider || !riderDraft) return;
    await onUpdate(editingRider.riderId, riderDraft);
    setEditingRider(null);
    setRiderDraft(null);
  };

  if (!riders.length) return <EmptyState title="No rider accounts found" message="Try another search or refresh the data." />;
  return (
    <>
      <div className="record-list">
        {riders.map((rider) => {
          const account = users.get(rider.userId);
          const busy = busyKey === `rider-${rider.riderId}`;
          const reviewed = reviewedRiders.has(rider.riderId);
          return (
            <article className="record-card rider-card" key={rider.riderId}>
              <div className="record-main">
                <div className="record-avatar">{(account?.fullName || account?.email || "R").slice(0, 1).toUpperCase()}</div>
                <div className="record-copy">
                  <div className="record-title"><h3>{account?.fullName || "Rider account"}</h3><Status value={rider.isApproved ? "approved" : "pending"} /></div>
                  <p>{account?.email || `Account #${rider.userId}`}</p>
                  <div className="detail-chips">
                    <span>{titleCase(rider.vehicleType)}</span>
                    {rider.vehicleModel ? <span>{rider.vehicleModel}</span> : null}
                    {rider.vehiclePlateNumber ? <span>{rider.vehiclePlateNumber}</span> : null}
                    {rider.licenseNumber ? <span>License {rider.licenseNumber}</span> : null}
                    <span>{rider.isAvailable ? "Online" : "Offline"}</span>
                  </div>
                </div>
              </div>
              {!rider.isApproved ? (
                <div className="record-actions rider-review-actions">
                  <button
                    className="button secondary"
                    onClick={() => void openDocuments(rider)}
                  >
                    {reviewed ? "Review documents again" : "Preview documents"}
                  </button>
                  <button
                    className="button primary"
                    disabled={busy || !reviewed}
                    title={!reviewed ? "Preview and confirm the documents before approval." : undefined}
                    onClick={() => {
                      void onReview(
                        rider,
                        true,
                        reviewedRiders.get(rider.riderId),
                      ).then((saved) => {
                        if (!saved) {
                          setReviewedRiders((current) => {
                            const next = new Map(current);
                            next.delete(rider.riderId);
                            return next;
                          });
                        }
                      });
                    }}
                  >
                    {busy ? "Saving…" : "Approve rider"}
                  </button>
                  {!reviewed ? (
                    <span className="review-note">Preview and confirm all submitted documents before approval.</span>
                  ) : null}
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => {
                      setEditingRider(rider);
                      setRiderDraft({
                        vehicleType: rider.vehicleType,
                        vehicleModel: rider.vehicleModel,
                        vehicleColor: rider.vehicleColor,
                        vehiclePlateNumber: rider.vehiclePlateNumber,
                        licenseNumber: rider.licenseNumber,
                      });
                    }}
                  >
                    Edit details
                  </button>
                  <button
                    className="button danger-outline"
                    disabled={busy}
                    onClick={() => onDelete(rider)}
                  >
                    Delete account
                  </button>
                </div>
              ) : (
                <div className="record-actions rider-review-actions">
                  <button
                    className="button secondary"
                    disabled={busy}
                    onClick={() => {
                      setEditingRider(rider);
                      setRiderDraft({
                        vehicleType: rider.vehicleType,
                        vehicleModel: rider.vehicleModel,
                        vehicleColor: rider.vehicleColor,
                        vehiclePlateNumber: rider.vehiclePlateNumber,
                        licenseNumber: rider.licenseNumber,
                      });
                    }}
                  >
                    Edit details
                  </button>
                  <button
                    className="button danger-outline"
                    disabled={busy}
                    onClick={() => onDelete(rider)}
                  >
                    Delete account
                  </button>
                  <button className="button danger-outline" disabled={busy} onClick={() => void onReview(rider, false)}>{busy ? "Saving…" : "Suspend"}</button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {editingRider && riderDraft ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            setEditingRider(null);
            setRiderDraft(null);
          }}
        >
          <form
            className="modal-card user-modal"
            onSubmit={(event) => void saveRider(event)}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">RIDER PROFILE</p>
                <h2>Edit rider details</h2>
                <p>Approval and availability remain managed separately.</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setEditingRider(null);
                  setRiderDraft(null);
                }}
                aria-label="Close rider editor"
              >
                ×
              </button>
            </div>
            <div className="user-form-grid">
              <label>
                Vehicle type
                <select
                  value={riderDraft.vehicleType}
                  onChange={(event) =>
                    setRiderDraft({
                      ...riderDraft,
                      vehicleType: event.target.value,
                    })
                  }
                >
                  {["bicycle", "motorcycle", "car", "scooter", "van", "truck"].map(
                    (type) => <option key={type} value={type}>{titleCase(type)}</option>,
                  )}
                </select>
              </label>
              <label>
                Vehicle model
                <input
                  maxLength={50}
                  value={riderDraft.vehicleModel ?? ""}
                  onChange={(event) =>
                    setRiderDraft({
                      ...riderDraft,
                      vehicleModel: event.target.value || null,
                    })
                  }
                />
              </label>
              <label>
                Vehicle color
                <input
                  maxLength={30}
                  value={riderDraft.vehicleColor ?? ""}
                  onChange={(event) =>
                    setRiderDraft({
                      ...riderDraft,
                      vehicleColor: event.target.value || null,
                    })
                  }
                />
              </label>
              <label>
                Plate number
                <input
                  maxLength={20}
                  value={riderDraft.vehiclePlateNumber ?? ""}
                  onChange={(event) =>
                    setRiderDraft({
                      ...riderDraft,
                      vehiclePlateNumber: event.target.value || null,
                    })
                  }
                />
              </label>
              <label>
                License number
                <input
                  maxLength={50}
                  value={riderDraft.licenseNumber ?? ""}
                  onChange={(event) =>
                    setRiderDraft({
                      ...riderDraft,
                      licenseNumber: event.target.value || null,
                    })
                  }
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setEditingRider(null);
                  setRiderDraft(null);
                }}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={busyKey === `rider-${editingRider.riderId}`}
              >
                Save rider details
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {activeRider ? (
        <div className="modal-backdrop" onClick={closeDocuments}>
          <section
            className="modal-card document-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="document-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">RIDER APPLICATION</p>
                <h2 id="document-modal-title">Submitted documents</h2>
                <p>Private previews expire after a few minutes.</p>
              </div>
              <button className="modal-close" onClick={closeDocuments} aria-label="Close document preview">×</button>
            </div>
            {documentsLoading ? (
              <div className="loading-panel"><div className="loader" />Loading secure previews…</div>
            ) : documentsError ? (
              <div className="alert error" role="alert">{documentsError}</div>
            ) : (
              <>
                {documents.length ? (
                  <div className="document-grid">
                    {documents.map((document) => (
                      <article className="document-preview" key={document.documentType}>
                        <h3>{titleCase(document.documentType)}</h3>
                        <a href={document.url} target="_blank" rel="noreferrer">
                          {failedDocumentIds.has(document.documentId) ? (
                            <span className="document-load-error">Preview unavailable</span>
                          ) : (
                            <img
                              src={document.url}
                              alt={titleCase(document.documentType)}
                              onLoad={() =>
                                setLoadedDocumentIds(
                                  (current) =>
                                    new Set(current).add(document.documentId),
                                )
                              }
                              onError={() =>
                                setFailedDocumentIds(
                                  (current) =>
                                    new Set(current).add(document.documentId),
                                )
                              }
                            />
                          )}
                        </a>
                        <small>{(document.fileSize / 1024 / 1024).toFixed(2)} MB</small>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState title="No documents uploaded" message="The rider must upload the required documents before they can be reviewed." />
                )}
                {documents.length === 6 &&
                documents.every((document) =>
                  loadedDocumentIds.has(document.documentId),
                ) ? (
                  <label className="review-confirmation">
                    <input
                      type="checkbox"
                      checked={confirmedReview}
                      onChange={(event) => setConfirmedReview(event.target.checked)}
                    />
                    I reviewed all six document images and verified the details.
                  </label>
                ) : documents.length === 6 ? (
                  <div className="document-warning">
                    {failedDocumentIds.size
                      ? "Some images could not be loaded. Refresh the previews before confirming."
                      : "Wait for all six document previews to load before confirming your review."}
                    {failedDocumentIds.size ? (
                      <button
                        className="button secondary refresh-documents"
                        onClick={() => {
                          if (activeRider) void openDocuments(activeRider);
                        }}
                      >
                        Refresh previews
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p className="document-warning">
                    {documents.length}/6 required documents uploaded. Approval remains unavailable until all documents are submitted.
                  </p>
                )}
                <div className="modal-actions">
                  <button className="button secondary" onClick={closeDocuments}>Close</button>
                  {documents.length === 6 ? (
                    <button
                      className="button primary"
                      disabled={
                        !confirmedReview ||
                        !documents.every((document) =>
                          loadedDocumentIds.has(document.documentId),
                        )
                      }
                      onClick={closeDocuments}
                    >
                      Confirm review
                    </button>
                  ) : null}
                </div>
              </>
            )}
          </section>
        </div>
      ) : null}
    </>
  );
}

function OrdersSection({
  orders,
  riders,
  busyKey,
  onStatus,
  onAssign,
  onDelete,
}: {
  orders: Order[];
  riders: Rider[];
  busyKey: string | null;
  onStatus: (id: number, status: string) => Promise<void>;
  onAssign: (orderId: number, riderId: number | null) => Promise<void>;
  onDelete: (order: Order) => void;
}) {
  if (!orders.length) return <EmptyState title="No orders found" message="Orders will appear here as customers place them." />;
  const statuses = ["pending", "confirmed", "preparing", "ready", "picked_up", "in_transit", "delivered", "cancelled"];
  return (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Order</th><th>Type</th><th>Shop / Items</th><th>Customer</th><th>Total</th><th>Payment</th><th>Rider</th><th>Status</th><th>Placed</th><th>Actions</th></tr></thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.orderId}>
              <td><strong>{order.orderReference}</strong><small>#{order.orderId}</small></td>
              <td>{titleCase(order.orderType)}</td>
              <td>
                <strong>{order.shopName || `Shop #${order.shopId}`}</strong>
                {order.items?.length ? (
                  <small>
                    {order.items
                      .map((item) => `${item.quantity} × ${item.productName}`)
                      .join(" · ")}
                  </small>
                ) : (
                  <small>No product details</small>
                )}
              </td>
              <td>Account #{order.userId}</td>
              <td>{money(order.totalAmount)}</td>
              <td>
                <Status value={order.paymentStatus} />
                <small>{titleCase(order.paymentMethod)}</small>
              </td>
              <td>
                <select
                  className="status-select"
                  value={order.riderId ?? ""}
                  disabled={busyKey === `order-${order.orderId}`}
                  onChange={(event) =>
                    void onAssign(
                      order.orderId,
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                  aria-label={`Assign rider to ${order.orderReference}`}
                >
                  <option value="">Unassigned</option>
                  {riders
                    .filter(
                      (rider) =>
                        rider.isApproved || rider.riderId === order.riderId,
                    )
                    .map((rider) => (
                    <option key={rider.riderId} value={rider.riderId}>
                      {rider.isApproved
                        ? `Rider #${rider.riderId}`
                        : `Rider #${rider.riderId} (not approved)`}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  className="status-select"
                  value={order.status}
                  disabled={busyKey === `order-${order.orderId}`}
                  onChange={(event) => void onStatus(order.orderId, event.target.value)}
                  aria-label={`Update ${order.orderReference} status`}
                >
                  {statuses.map((status) => <option key={status} value={status}>{titleCase(status)}</option>)}
                </select>
              </td>
              <td>{date(order.orderPlacedAt)}</td>
              <td>
                <button
                  className="button danger-outline"
                  disabled={
                    busyKey === `order-${order.orderId}` ||
                    order.status !== "pending" ||
                    order.paymentStatus !== "pending" ||
                    order.riderId !== null ||
                    Boolean(order.items?.length)
                  }
                  title={
                    order.items?.length
                      ? "Shop orders must be cancelled to preserve inventory and order history."
                      : "Only unassigned, pending, unpaid orders can be deleted."
                  }
                  onClick={() => onDelete(order)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeliveriesSection({
  deliveries,
  riders,
  busyKey,
  onStatus,
  onAssign,
  onDelete,
}: {
  deliveries: Delivery[];
  riders: Rider[];
  busyKey: string | null;
  onStatus: (id: number, status: string) => Promise<void>;
  onAssign: (deliveryId: number, riderId: number | null) => Promise<void>;
  onDelete: (delivery: Delivery) => void;
}) {
  if (!deliveries.length) {
    return (
      <EmptyState
        title="No deliveries found"
        message="Customer delivery requests will appear here."
      />
    );
  }

  const statuses = [
    "pending",
    "searching",
    "accepted",
    "picked_up",
    "in_transit",
    "delivered",
    "failed",
    "cancelled",
  ];
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Delivery</th>
            <th>Type</th>
            <th>Customer</th>
            <th>Recipient</th>
            <th>Route</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Rider</th>
            <th>Status</th>
            <th>Placed</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((delivery) => (
            <tr key={delivery.deliveryId}>
              <td>
                <strong>{delivery.deliveryReference}</strong>
                <small>#{delivery.deliveryId}</small>
              </td>
              <td>{titleCase(delivery.deliveryType)}</td>
              <td>Account #{delivery.senderId}</td>
              <td>{delivery.recipientName}</td>
              <td>
                <strong>{delivery.pickupAddress}</strong>
                <small>To {delivery.dropoffAddress}</small>
              </td>
              <td>{money(delivery.totalAmount)}</td>
              <td><Status value={delivery.paymentStatus} /></td>
              <td>
                <select
                  className="status-select"
                  value={delivery.riderId ?? ""}
                  disabled={busyKey === `delivery-${delivery.deliveryId}`}
                  onChange={(event) =>
                    void onAssign(
                      delivery.deliveryId,
                      event.target.value ? Number(event.target.value) : null,
                    )
                  }
                  aria-label={`Assign rider to ${delivery.deliveryReference}`}
                >
                  <option value="">Unassigned</option>
                  {riders
                    .filter(
                      (rider) =>
                        rider.isApproved || rider.riderId === delivery.riderId,
                    )
                    .map((rider) => (
                    <option key={rider.riderId} value={rider.riderId}>
                      {rider.isApproved
                        ? `Rider #${rider.riderId}`
                        : `Rider #${rider.riderId} (not approved)`}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                <select
                  className="status-select"
                  value={delivery.status}
                  disabled={busyKey === `delivery-${delivery.deliveryId}`}
                  onChange={(event) =>
                    void onStatus(delivery.deliveryId, event.target.value)
                  }
                  aria-label={`Update ${delivery.deliveryReference} status`}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>{titleCase(status)}</option>
                  ))}
                </select>
              </td>
              <td>{date(delivery.createdAt)}</td>
              <td>
                <button
                  className="button danger-outline"
                  disabled={
                    busyKey === `delivery-${delivery.deliveryId}` ||
                    delivery.status !== "pending" ||
                    delivery.paymentStatus !== "pending" ||
                    delivery.riderId !== null
                  }
                  title="Only unassigned, pending, unpaid deliveries can be deleted."
                  onClick={() => onDelete(delivery)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RidesSection({
  rides,
  users,
  riders,
  busyKey,
  onStatus,
}: {
  rides: Ride[];
  users: Map<number, Account>;
  riders: Rider[];
  busyKey: string | null;
  onStatus: (rideId: number, status: string) => Promise<void>;
}) {
  if (!rides.length) {
    return (
      <EmptyState
        title="No rides found"
        message="Customer ride bookings will appear here."
      />
    );
  }

  const riderById = new Map(riders.map((rider) => [rider.riderId, rider]));
  const statuses = [
    "pending",
    "searching",
    "confirmed",
    "arrived",
    "in_progress",
    "completed",
    "cancelled",
    "rejected",
    "no_show",
  ];

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ride</th>
            <th>Passenger</th>
            <th>Route</th>
            <th>Distance</th>
            <th>Total</th>
            <th>Payment</th>
            <th>Rider</th>
            <th>Status</th>
            <th>Booked</th>
          </tr>
        </thead>
        <tbody>
          {rides.map((ride) => {
            const passenger = users.get(ride.userId);
            const assignedRider = ride.riderId
              ? riderById.get(ride.riderId)
              : undefined;
            const riderAccount = assignedRider
              ? users.get(assignedRider.userId)
              : undefined;
            return (
              <tr key={ride.rideId}>
                <td>
                  <strong>{ride.rideReference}</strong>
                  <small>
                    #{ride.rideId} · {titleCase(ride.rideType)} · {titleCase(ride.bookingType)}
                  </small>
                </td>
                <td>
                  <strong>{ride.passengerName || passenger?.fullName || `Account #${ride.userId}`}</strong>
                  <small>{ride.passengerPhone || passenger?.phoneNumber || ride.passengerEmail || "—"}</small>
                </td>
                <td>
                  <strong>{ride.pickupAddress}</strong>
                  <small>To {ride.dropoffAddress}</small>
                </td>
                <td>
                  {ride.estimatedDistance == null
                    ? "—"
                    : `${Number(ride.estimatedDistance).toFixed(2)} km`}
                </td>
                <td>{ride.estimatedPrice == null ? "—" : money(ride.estimatedPrice)}</td>
                <td>
                  <Status value={ride.paymentStatus} />
                  <small>{titleCase(ride.paymentMethod)}</small>
                </td>
                <td>
                  {ride.riderId == null
                    ? "Unassigned"
                    : riderAccount?.fullName || `Rider #${ride.riderId}`}
                </td>
                <td>
                  <select
                    className="status-select"
                    value={ride.status}
                    disabled={busyKey === `ride-${ride.rideId}`}
                    onChange={(event) => void onStatus(ride.rideId, event.target.value)}
                    aria-label={`Update ${ride.rideReference} status`}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{date(ride.bookedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SupportSection({
  tickets,
  users,
  busyKey,
  onUpdate,
  onDelete,
}: {
  tickets: Ticket[];
  users: Map<number, Account>;
  busyKey: string | null;
  onUpdate: (
    id: number,
    updates: { status?: string; priority?: string; assignedTo?: number | null },
  ) => Promise<void>;
  onDelete: (ticket: Ticket) => void;
}) {
  if (!tickets.length) return <EmptyState title="Support queue is clear" message="New support requests will appear here." />;
  return (
    <div className="record-list">
      {tickets.map((ticket) => (
        <article className="record-card ticket-card" key={ticket.ticketId}>
          <div className="record-copy">
            <div className="record-title"><h3>{ticket.subject}</h3><Status value={ticket.status} /></div>
            <p>{users.get(ticket.userId)?.fullName || users.get(ticket.userId)?.email || `Account #${ticket.userId}`} · {titleCase(ticket.category)} · {date(ticket.createdAt)}</p>
            <div className="ticket-message">{ticket.message}</div>
            <small>Preferred contact: {titleCase(ticket.contactMethod)}</small>
          </div>
          <div className="ticket-controls">
            <label>Priority
              <select value={ticket.priority} disabled={busyKey === `ticket-${ticket.ticketId}`} onChange={(event) => void onUpdate(ticket.ticketId, { priority: event.target.value })}>
                {["low", "medium", "high", "urgent"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
              </select>
            </label>
            <label>Status
              <select value={ticket.status} disabled={busyKey === `ticket-${ticket.ticketId}`} onChange={(event) => void onUpdate(ticket.ticketId, { status: event.target.value })}>
                {["open", "in_progress", "resolved", "closed"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
              </select>
            </label>
            <label>Assigned to
              <select
                value={ticket.assignedTo ?? ""}
                disabled={busyKey === `ticket-${ticket.ticketId}`}
                onChange={(event) =>
                  void onUpdate(ticket.ticketId, {
                    assignedTo: event.target.value ? Number(event.target.value) : null,
                  })
                }
              >
                <option value="">Unassigned</option>
                {[...users.values()].map((account) => (
                  <option key={account.userId} value={account.userId}>
                    {account.fullName || account.email}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button danger-outline"
              disabled={busyKey === `ticket-${ticket.ticketId}`}
              onClick={() => onDelete(ticket)}
            >
              Delete ticket
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function UsersSection({
  users,
  busyKey,
  onCreate,
  currentUserId,
  onUpdate,
  onDelete,
}: {
  users: Account[];
  busyKey: string | null;
  onCreate: (account: NewAccount) => Promise<string | null>;
  currentUserId: number;
  onUpdate: (userId: number, updates: AccountUpdate) => Promise<void>;
  onDelete: (account: Account) => void;
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editDraft, setEditDraft] = useState<AccountUpdate | null>(null);
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState<NewAccount>({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    userType: "customer",
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    const error = await onCreate(draft);
    if (error) {
      setFormError(error);
      return;
    }
    setDraft({
      fullName: "",
      email: "",
      phoneNumber: "",
      password: "",
      userType: "customer",
    });
    setIsCreating(false);
  };

  const submitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingAccount || !editDraft) return;
    await onUpdate(editingAccount.userId, editDraft);
    setEditingAccount(null);
    setEditDraft(null);
  };

  return (
    <>
      <div className="users-actions">
        <span>Create customer, rider, or administrator accounts.</span>
        <button className="button primary" onClick={() => setIsCreating(true)}>+ Add user</button>
      </div>
      {users.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Account</th><th>Email</th><th>Phone</th><th>Role</th><th>Access</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((account) => (
                <tr key={account.userId}>
                  <td><strong>{account.fullName || "Name not provided"}</strong><small>#{account.userId}</small></td>
                  <td>{account.email}</td><td>{account.phoneNumber || "—"}</td>
                  <td><Status value={account.userType} /></td><td>{account.isActive ? "Active" : "Disabled"}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="button secondary"
                        disabled={busyKey === `user-${account.userId}`}
                        onClick={() => {
                          setEditingAccount(account);
                          setEditDraft({
                            fullName: account.fullName ?? "",
                            email: account.email,
                            phoneNumber: account.phoneNumber ?? "",
                            isActive: account.isActive,
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="button danger-outline"
                        disabled={
                          account.userId === currentUserId ||
                          busyKey === `user-${account.userId}`
                        }
                        title={
                          account.userId === currentUserId
                            ? "You cannot delete your own administrator account."
                            : undefined
                        }
                        onClick={() => onDelete(account)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No accounts found" message="Create an account or change your search." />
      )}
      {isCreating ? (
        <div className="modal-backdrop" onClick={() => setIsCreating(false)}>
          <form
            className="modal-card user-modal"
            onSubmit={(event) => void submit(event)}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">USER MANAGEMENT</p>
                <h2>Add user</h2>
                <p>New accounts are active and verified immediately.</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setIsCreating(false)} aria-label="Close form">×</button>
            </div>
            {formError ? <div className="alert error" role="alert">{formError}</div> : null}
            <div className="user-form-grid">
              <label>
                Full name
                <input
                  autoComplete="name"
                  maxLength={100}
                  required
                  value={draft.fullName}
                  onChange={(event) => setDraft({ ...draft, fullName: event.target.value })}
                />
              </label>
              <label>
                Email
                <input
                  autoComplete="email"
                  type="email"
                  required
                  value={draft.email}
                  onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                />
              </label>
              <label>
                Phone number <span className="optional-label">Optional</span>
                <input
                  autoComplete="tel"
                  maxLength={20}
                  value={draft.phoneNumber}
                  onChange={(event) => setDraft({ ...draft, phoneNumber: event.target.value })}
                />
              </label>
              <label>
                Role
                <select
                  value={draft.userType}
                  onChange={(event) => setDraft({ ...draft, userType: event.target.value as NewAccount["userType"] })}
                >
                  <option value="customer">Customer</option>
                  <option value="rider">Rider</option>
                  <option value="admin">Administrator</option>
                </select>
              </label>
              <label className="user-form-wide">
                Initial password
                <input
                  autoComplete="new-password"
                  type="password"
                  minLength={8}
                  required
                  value={draft.password}
                  onChange={(event) => setDraft({ ...draft, password: event.target.value })}
                />
                <small>At least 8 characters. Share it with the user securely.</small>
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" className="button secondary" onClick={() => setIsCreating(false)}>Cancel</button>
              <button className="button primary" disabled={busyKey === "user-create"}>
                {busyKey === "user-create" ? "Creating…" : "Create account"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {editingAccount && editDraft ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            setEditingAccount(null);
            setEditDraft(null);
          }}
        >
          <form
            className="modal-card user-modal"
            onSubmit={(event) => void submitEdit(event)}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">USER MANAGEMENT</p>
                <h2>Edit account</h2>
                <p>                Use a valid email address or phone number for sign-in. Role changes are restricted to protect account access.</p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => {
                  setEditingAccount(null);
                  setEditDraft(null);
                }}
                aria-label="Close account editor"
              >
                ×
              </button>
            </div>
            <div className="user-form-grid">
              <label>
                Full name
                <input
                  maxLength={100}
                  required
                  value={editDraft.fullName ?? ""}
                  onChange={(event) =>
                    setEditDraft({ ...editDraft, fullName: event.target.value })
                  }
                />
              </label>
              <label>
                Login ID (email or phone)
                <input
                  type="text"
                  required
                  value={editDraft.email}
                  onChange={(event) =>
                    setEditDraft({ ...editDraft, email: event.target.value })
                  }
                />
              </label>
              <label>
                Phone number
                <input
                  maxLength={20}
                  value={editDraft.phoneNumber ?? ""}
                  onChange={(event) =>
                    setEditDraft({
                      ...editDraft,
                      phoneNumber: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Access
                <select
                  value={editDraft.isActive ? "active" : "disabled"}
                  disabled={editingAccount.userId === currentUserId}
                  onChange={(event) =>
                    setEditDraft({
                      ...editDraft,
                      isActive: event.target.value === "active",
                    })
                  }
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => {
                  setEditingAccount(null);
                  setEditDraft(null);
                }}
              >
                Cancel
              </button>
              <button
                className="button primary"
                disabled={busyKey === `user-${editingAccount.userId}`}
              >
                Save account
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}

function ConfigSection({
  configs,
  drafts,
  busyKey,
  onDraft,
  onSave,
}: {
  configs: SystemConfig[];
  drafts: Record<string, string>;
  busyKey: string | null;
  onDraft: (key: string, value: string) => void;
  onSave: (item: SystemConfig) => Promise<void>;
}) {
  if (!configs.length) return <EmptyState title="No system settings configured" message="System configuration keys will appear here when configured." />;
  return (
    <div className="config-list">
      {configs.map((item) => (
        <article className="config-card" key={item.configKey}>
          <div className="config-heading"><div><h3>{titleCase(item.configKey)}</h3><p>{item.description || item.configGroup || "System configuration"}</p></div><code>{item.configKey}</code></div>
          <div className="config-edit">
            <input
              value={drafts[item.configKey] ?? ""}
              onChange={(event) => onDraft(item.configKey, event.target.value)}
              disabled={!item.isEditable}
              aria-label={`${item.configKey} value`}
            />
            <button className="button primary" disabled={!item.isEditable || busyKey === `config-${item.configKey}`} onClick={() => void onSave(item)}>
              {busyKey === `config-${item.configKey}` ? "Saving…" : "Save"}
            </button>
          </div>
          {!item.isEditable ? <small className="muted">This value is read-only.</small> : null}
        </article>
      ))}
    </div>
  );
}

function PricingSection({
  rates,
  drafts,
  busy,
  onDraft,
  onSave,
}: {
  rates: PricingRates;
  drafts: PricingRates;
  busy: boolean;
  onDraft: (key: keyof PricingRates, value: string) => void;
  onSave: () => Promise<void>;
}) {
  return (
    <form
      className="panel pricing-panel"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
    >
      <div className="config-heading">
        <div>
          <h3>Per-kilometer rates</h3>
          <p>These rates are used for customer quotes and payment totals.</p>
        </div>
      </div>
      <div className="pricing-grid">
        <label>
          Delivery rate per km (GHS)
          <input
            type="number"
            min="0"
            max="9999.99"
            step="0.01"
            required
            value={drafts.deliveryPerKm}
            onChange={(event) => onDraft("deliveryPerKm", event.target.value)}
          />
          <small>Currently applied: GHS {Number(rates.deliveryPerKm).toFixed(2)} / km</small>
        </label>
        <label>
          Ride rate per km (GHS)
          <input
            type="number"
            min="0"
            max="9999.99"
            step="0.01"
            required
            value={drafts.ridePerKm}
            onChange={(event) => onDraft("ridePerKm", event.target.value)}
          />
          <small>Currently applied: GHS {Number(rates.ridePerKm).toFixed(2)} / km</small>
        </label>
      </div>
      <p className="muted pricing-note">
        A GHS 5.00 base fare is added to each trip. Rates accept values from 0.00 to 9999.99.
      </p>
      <div>
        <button className="button primary" disabled={busy}>
          {busy ? "Saving…" : "Save rates"}
        </button>
      </div>
    </form>
  );
}

function Status({ value }: { value: string }) {
  const tone = ["approved", "paid", "resolved", "delivered", "active"].includes(value)
    ? "positive"
    : ["pending", "open", "in_progress", "preparing"].includes(value)
      ? "warning"
      : ["cancelled", "rejected", "failed", "disabled"].includes(value)
        ? "negative"
        : "neutral";
  return <span className={`status-pill ${tone}`}>{titleCase(value)}</span>;
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return <div className="empty-state"><span>✓</span><strong>{title}</strong><p>{message}</p></div>;
}

export default App;
