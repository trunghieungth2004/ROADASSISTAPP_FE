export type MyShop = {
  id: string;
  name: string;
  type: string;
  accepting?: boolean;
};

const KEY = "roadassist.myShops";

export function getMyShops(): MyShop[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as MyShop[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(shops: MyShop[]): MyShop[] {
  try {
    localStorage.setItem(KEY, JSON.stringify(shops));
  } catch {
    return shops;
  }
  return shops;
}

export function addMyShop(shop: MyShop): MyShop[] {
  const rest = getMyShops().filter((s) => s.id !== shop.id);
  return save([...rest, shop]);
}

export function setMyShopAccepting(
  id: string,
  accepting: boolean,
): MyShop[] {
  return save(
    getMyShops().map((s) => (s.id === id ? {...s, accepting} : s)),
  );
}
