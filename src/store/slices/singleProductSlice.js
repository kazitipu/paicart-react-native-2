import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  product: null,
  symbol: 'Tk',
};

const singleProductSlice = createSlice({
  name: 'singleProduct',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addMatcher(
      (action) => action.type === 'SET_SEARCHED_PRODUCT_DETAIL',
      (state, action) => {
        if (action.payload !== null && action.payload !== undefined) {
          const raw = action.payload.prodct_array || action.payload;

          // 1688 / search-result products already have id, name, pictures[] — store as-is
          if (raw.id && raw.name && Array.isArray(raw.pictures)) {
            state.product = { ...raw, availability: action.route || raw.availability };
          } else {
            // Taobao API response — map to unified shape
            const imgsArray = raw.item_imgs ? raw.item_imgs.map((i) => i.url) : [];
            state.product = {
              shop_name: raw.seller_info?.shop_name,
              shop_id: raw.seller_info?.sid,
              id: raw.num_iid,
              detail_url: raw.detail_url,
              name: raw.title,
              pictures: [raw.pic_url, ...imgsArray].filter(Boolean),
              salePrice: raw.price,
              price: raw.orginal_price,
              availability: action.route,
              categoryId: raw.cid,
              rating: '5.0',
              description: raw.desc,
              orders: raw.total_sold,
              totalAvailableQuantity: '',
              specs: raw.props,
              variants: raw.skus ? raw.skus.sku : [],
              feedback: [],
              brand: raw.brand,
              brandId: raw.brandId,
              props_name: raw.props_name,
              props_list: raw.props_list,
              props_imgs: raw.props_imgs || raw.prop_imgs,
              item_weight: raw.item_weight,
              price_range: raw.priceRange || [],
            };
          }
        } else {
          state.product = action.payload;
        }
      }
    );
  },
});

export default singleProductSlice.reducer;
