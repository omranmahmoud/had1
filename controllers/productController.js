
import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';
import InventoryHistory from '../models/InventoryHistory.js';
import { validateProductData } from '../utils/validation.js';
import { handleProductImages } from '../utils/imageHandler.js';
import { convertPrice } from '../utils/currency.js';

// Get all products
export const getProducts = async (req, res) => {
  try {
    const { search, currency = 'USD', category, isNew, isFeatured } = req.query;
    
    let query = {};
    
    // Apply filters
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } }
        ]
      };
    }

    if (category) {
      query.category = category;
    }

    if (isNew === 'true') {
      query.isNew = true;
    }

    if (isFeatured === 'true') {
      query.isFeatured = true;
    }

    const products = await Product.find(query)
      .populate('relatedProducts')
      .populate({
        path: 'reviews.user',
        select: 'name email image'
      })
      .sort({ isFeatured: -1, order: 1, createdAt: -1 });

    // Get inventory data for each product
    const productsWithInventory = await Promise.all(
      products.map(async (product) => {
        const inventory = await Inventory.find({ product: product._id });
        const productObj = product.toObject();
        
        // Add inventory data to each product
        productObj.inventory = inventory;
        
        // Convert prices if needed
        if (currency !== 'USD') {
          productObj.price = await convertPrice(product.price, 'USD', currency);
          if (product.originalPrice) {
            productObj.originalPrice = await convertPrice(product.originalPrice, 'USD', currency);
          }
        }
        
        return productObj;
      })
    );

    res.json(productsWithInventory);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
};

// Get single product
export const getProduct = async (req, res) => {
  try {
    const { currency = 'USD' } = req.query;
    
    const product = await Product.findById(req.params.id)
      .populate('relatedProducts')
      .populate({
        path: 'reviews.user',
        select: 'name email image'
      });
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Get inventory data
    const inventory = await Inventory.find({ product: product._id });
    const productObj = product.toObject();
    productObj.inventory = inventory;

    // Convert prices if needed
    if (currency !== 'USD') {
      productObj.price = await convertPrice(product.price, 'USD', currency);
      if (product.originalPrice) {
        productObj.originalPrice = await convertPrice(product.originalPrice, 'USD', currency);
      }
    }

    res.json(productObj);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create product
export const createProduct = async (req, res) => {
  try {
    // Validate product data
    const { isValid, errors } = validateProductData(req.body);
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid product data', errors });
    }

    // Handle image uploads
    const validatedImages = await handleProductImages(req.body.images);

    // Convert price to USD for storage
    const priceInUSD = await convertPrice(req.body.price, req.body.currency || 'USD', 'USD');

    // Create product
    const product = new Product({
      ...req.body,
      price: priceInUSD,
      images: validatedImages,
      order: req.body.isFeatured ? await Product.countDocuments({ isFeatured: true }) : 0
    });
    
    const savedProduct = await product.save();

    // Create inventory records for each size and color combination
    const inventoryPromises = req.body.sizes.flatMap(size => 
      req.body.colors.map(color => 
        new Inventory({
          product: savedProduct._id,
          size: size.name,
          color: color.name,
          quantity: size.stock,
          location: 'Main Warehouse',
          lowStockThreshold: 5
        }).save()
      )
    );

    await Promise.all(inventoryPromises);

    // Create inventory history record
    await new InventoryHistory({
      product: savedProduct._id,
      type: 'increase',
      quantity: req.body.sizes.reduce((total, size) => total + size.stock, 0),
      reason: 'Initial stock',
      user: req.user._id
    }).save();

    res.status(201).json(savedProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(400).json({ message: error.message });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const { sizes, colors, ...updateData } = req.body;
    
    // Update product
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Update inventory if sizes or colors changed
    if (sizes || colors) {
      // Get current inventory
      const currentInventory = await Inventory.find({ product: product._id });

      // Create new inventory records for new size/color combinations
      const newCombinations = sizes.flatMap(size => 
        colors.map(color => ({
          size: size.name,
          color: color.name,
          stock: size.stock
        }))
      );

      // Update or create inventory records
      await Promise.all(
        newCombinations.map(async ({ size, color, stock }) => {
          const existing = currentInventory.find(inv => 
            inv.size === size && inv.color === color
          );

          if (existing) {
            const oldQuantity = existing.quantity;
            existing.quantity = stock;
            await existing.save();

            // Create history record for quantity change
            if (oldQuantity !== stock) {
              await new InventoryHistory({
                product: product._id,
                type: stock > oldQuantity ? 'increase' : 'decrease',
                quantity: Math.abs(stock - oldQuantity),
                reason: 'Stock update',
                user: req.user._id
              }).save();
            }
          } else {
            const newInventory = await new Inventory({
              product: product._id,
              size,
              color,
              quantity: stock,
              location: 'Main Warehouse',
              lowStockThreshold: 5
            }).save();

            // Create history record for new inventory
            await new InventoryHistory({
              product: product._id,
              type: 'increase',
              quantity: stock,
              reason: 'New size/color added',
              user: req.user._id
            }).save();
          }
        })
      );
    }

    res.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(400).json({ message: error.message });
  }
};

// Delete product
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Delete associated inventory records
    await Inventory.deleteMany({ product: product._id });
    
    // Create history record for deletion
    await new InventoryHistory({
      product: product._id,
      type: 'decrease',
      quantity: product.stock,
      reason: 'Product deleted',
      user: req.user._id
    }).save();
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: error.message });
  }
};

// Search products
export const searchProducts = async (req, res) => {
  try {
    const { query, currency = 'USD' } = req.query;
    
    if (!query) {
      return res.json([]);
    }

    const products = await Product.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } }
      ]
    })
    .select('name price images category')
    .limit(12)
    .sort('-createdAt');

    // Convert prices if needed
    if (currency !== 'USD') {
      const convertedProducts = await Promise.all(
        products.map(async (product) => {
          const convertedProduct = product.toObject();
          convertedProduct.price = await convertPrice(product.price, 'USD', currency);
          return convertedProduct;
        })
      );
      return res.json(convertedProducts);
    }

    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ message: 'Failed to search products' });
  }
};

// Update related products
export const updateRelatedProducts = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { relatedProducts: req.body.relatedProducts },
      { new: true }
    ).populate('relatedProducts');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json(product);
  } catch (error) {
    console.error('Error updating related products:', error);
    res.status(400).json({ message: error.message });
  }
};

// Reorder featured products
export const reorderFeaturedProducts = async (req, res) => {
  try {
    const { products } = req.body;
    await Promise.all(
      products.map(({ id, order }) => 
        Product.findByIdAndUpdate(id, { order })
      )
    );
    res.json({ message: 'Featured products reordered successfully' });
  } catch (error) {
    console.error('Error reordering featured products:', error);
    res.status(500).json({ message: 'Failed to reorder featured products' });
  }
};
