package com.bulk.bulkproject.service;

import com.bulk.bulkproject.entity.ProductRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.*;

@Service
public class ProductService {

    @Value("${product.storage.path}")  // e.g., D:/bulkproject-storage
    private String storagePath;

    private final ObjectMapper mapper = new ObjectMapper();

    public void saveProducts(List<ProductRequest> productData, List<MultipartFile> images) throws Exception {

        // Ensure root storage exists
        File rootDir = new File(storagePath);
        if (!rootDir.exists()) rootDir.mkdirs();

        // 🔍 FIRST LOAD ALL EXISTING PRODUCTS
        List<Map<String, Object>> existingProducts = getAllProducts();

        for (int i = 0; i < images.size(); i++) {
            ProductRequest data = productData.get(i);

            // ------------------------------
            // 🔥 DUPLICATE CHECK START
            // ------------------------------
            boolean duplicateFound = existingProducts.stream().anyMatch(p ->
                    p.get("name").toString().equalsIgnoreCase(data.getName()) &&
                            p.get("description").toString().equalsIgnoreCase(data.getDescription())
            );

            if (duplicateFound) {
                throw new RuntimeException(
                        " Duplicate product found: " + data.getName() + " (" + data.getDescription() + ")"
                );
            }
            // ------------------------------
            //  DUPLICATE CHECK END
            // ------------------------------

            MultipartFile image = images.get(i);
            if (image.isEmpty()) {
                throw new RuntimeException("Image file is empty for product: " + data.getName());
            }

            String folderName = "product_" + UUID.randomUUID();
            File productDir = new File(rootDir, folderName);
            productDir.mkdirs();

            // Save image
            String imageName = image.getOriginalFilename();
            File imageFile = new File(productDir, imageName);
            image.transferTo(imageFile);

            String imageUrl = folderName + "/" + imageName;

            Map<String, Object> json = new HashMap<>();
            json.put("name", data.getName());
            json.put("description", data.getDescription());
            json.put("price", data.getPrice());
            json.put("imageUrl", imageUrl);

            File jsonFile = new File(productDir, "product.json");
            mapper.writeValue(jsonFile, json);
        }
    }


    public List<Map<String, Object>> getAllProducts() throws Exception {
        List<Map<String, Object>> products = new ArrayList<>();
        File root = new File(storagePath);

        if (!root.exists()) return products;

        for (File folder : root.listFiles()) {
            if (folder.isDirectory()) {
                File jsonFile = new File(folder, "product.json");
                if (jsonFile.exists()) {
                    Map<String, Object> product = mapper.readValue(jsonFile, Map.class);
                    products.add(product);
                }
            }
        }

        return products;
    }


    public boolean deleteProduct(String folderName) throws Exception {
        File root = new File(storagePath);
        File productDir = new File(root, folderName);

        if (!productDir.exists()) {
            return false;  // folder not found
        }

        // Delete folder with all files inside
        deleteDirectory(productDir);

        System.out.println("Deleted product folder: " + productDir.getAbsolutePath());
        return true;
    }

    // Recursive delete directory
    private void deleteDirectory(File directory) {
        File[] allContents = directory.listFiles();
        if (allContents != null) {
            for (File file : allContents) {
                deleteDirectory(file);
            }
        }
        directory.delete();
    }

    public boolean editProduct(String folderName, ProductRequest updatedData, MultipartFile newImage) throws Exception {

        File root = new File(storagePath);
        File productDir = new File(root, folderName);

        if (!productDir.exists()) return false;

        // Load existing JSON
        File jsonFile = new File(productDir, "product.json");
        Map<String, Object> productMap = mapper.readValue(jsonFile, Map.class);

        // Update fields
        productMap.put("name", updatedData.getName());
        productMap.put("description", updatedData.getDescription());
        productMap.put("price", updatedData.getPrice());

        // Replace image if new image provided
        if (newImage != null && !newImage.isEmpty()) {

            // Delete old image
            String oldImageUrl = (String) productMap.get("imageUrl");
            if (oldImageUrl != null) {
                // Extract image file name
                String oldImageName = oldImageUrl.replace(folderName + "/", "");
                File oldImageFile = new File(productDir, oldImageName);
                if (oldImageFile.exists()) oldImageFile.delete();
            }

            // Save new image
            String newImageName = newImage.getOriginalFilename();
            File newImageFile = new File(productDir, newImageName);
            newImage.transferTo(newImageFile);

            // Update imageUrl in JSON
            productMap.put("imageUrl", folderName + "/" + newImageName);
        }

        // Save updated JSON
        mapper.writeValue(jsonFile, productMap);

        return true;
    }
    public List<Map<String, Object>> searchProducts(String keyword) throws Exception {
        List<Map<String, Object>> products = new ArrayList<>();
        File root = new File(storagePath);

        if (!root.exists()) return products;

        for (File folder : root.listFiles()) {
            if (folder.isDirectory()) {
                File jsonFile = new File(folder, "product.json");

                if (jsonFile.exists()) {
                    Map<String, Object> product = mapper.readValue(jsonFile, Map.class);

                    String name = product.get("name").toString().toLowerCase();
                    String keywordLower = keyword.toLowerCase();

                    // 🔍 Partial match: contains, startsWith, endsWith সব কাজ করবে
                    if (name.contains(keywordLower)) {
                        products.add(product);
                    }
                }
            }
        }
        return products;
    }



}
