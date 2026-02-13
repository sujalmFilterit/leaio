
interface PackageType {
  PackageName: string;
  PackageTitle: string;
}
 
export interface MenuApiResponse {
  Name: string;
  Route: string;
  Icon: string;
  Permission: string[];
  SubMenus: MenuApiResponse[];
  EmbeddedMenu?: boolean;
  Url?: string;
}
 
/**
 * Fetches user packages and returns the first valid package name
 */
export const fetchUserPackageName = async (token: string, productName: string): Promise<string | null> => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_PRODUCT}access_control/user_packages?product_name=${encodeURIComponent(productName)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          product_name: productName
        }),
      }
    );
   
    if (!response.ok) {
      throw new Error(`User packages API failed with status: ${response.status}`);
    }
   
    const data = await response.json();
    if (Array.isArray(data)) {
      // Filter out packages with empty PackageName values
      const validPackages = data.filter((pkg: PackageType) => pkg.PackageName && pkg.PackageName.trim() !== "");
      return validPackages[0]?.PackageName || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user packages:", error);
    return null;
  }
};
 
/**
 * Fetches menu data with package name
 */
export const fetchMenuWithPackage = async (
  token: string,
  productName: string,
  packageName?: string
): Promise<MenuApiResponse[]> => {
  try {
    // If package name is not provided, fetch it from user packages API
    let finalPackageName = packageName;
    if (!finalPackageName) {
      const fetchedPackageName = await fetchUserPackageName(token, productName);
      if (!fetchedPackageName) {
        throw new Error("No valid package found for user");
      }
      finalPackageName = fetchedPackageName;
    }
   
    const menuResponse = await fetch(
      `${process.env.NEXT_PUBLIC_PRODUCT}access_control/menus`,
      {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_name: productName,
          package_name: finalPackageName
        }),
      }
    );
   
    if (!menuResponse.ok) {
      throw new Error(`Menu API failed with status: ${menuResponse.status}`);
    }
   
    return await menuResponse.json();
  } catch (error) {
    console.error("Error fetching menu with package:", error);
    throw error;
  }
};
 
/**
 * Helper to recursively find the first submenu route
 */
export const findFirstSubMenuRoute = (menus: MenuApiResponse[]): string | null => {
  for (const menu of menus) {
    if (menu.Route && menu.Route !== "") {
      return menu.Route;
    }
    if (menu.SubMenus && menu.SubMenus.length > 0) {
      const subRoute = findFirstSubMenuRoute(menu.SubMenus);
      if (subRoute) return subRoute;
    }
  }
  return null;
};
 
/**
 * Helper to recursively find the menu name by route
 */
export const findMenuNameByRoute = (menus: MenuApiResponse[], pathname: string): string | null => {
  for (const menu of menus) {
    // Check if this menu's route matches
    if (menu.Route && menu.Route !== "" && (pathname === menu.Route || pathname.startsWith(menu.Route + "/"))) {
      return menu.Name;
    }
    // Check submenus recursively
    if (menu.SubMenus && menu.SubMenus.length > 0) {
      const subName = findMenuNameByRoute(menu.SubMenus, pathname);
      if (subName) return subName;
    }
  }
  return null;
};



 