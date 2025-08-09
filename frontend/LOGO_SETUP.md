# Logo Setup Guide for Paper Thread

This guide explains how to add your vector logo from Figma to your project and ensure it displays correctly in production.

## 🎨 Step 1: Export Your Logo from Figma

1. **Select your logo** in Figma
2. **Export in multiple formats:**
   - **SVG** (recommended for web - scalable, lightweight)
   - **PNG** (for fallback and better browser support)
   - **WebP** (modern format with excellent compression)

3. **Recommended export settings:**
   - SVG: Export as SVG
   - PNG: Export at 2x resolution (e.g., 80x80px for a 40x40px logo)
   - WebP: Same resolution as PNG

## 📁 Step 2: Add Logo Files to Your Project

Replace the placeholder files in `frontend/public/images/` with your actual exported logos:

```
frontend/public/images/
├── logo.svg          ← Your main SVG logo
├── logo.png          ← Your PNG logo (fallback)
└── logo.webp         ← Your WebP logo (optional)
```

## 🔧 Step 3: Logo Component Usage

The project now includes a `Logo` component that automatically handles:
- Format fallbacks
- Error handling
- Responsive sizing
- Accessibility

### Basic Usage

```tsx
import Logo from '@/components/Logo';

// Default size (40x40) with rounded background
<Logo />

// Custom size
<Logo width={64} height={64} />

// With priority loading (for above-the-fold logos)
<Logo priority />

// Different variants
<Logo variant="rounded" />  // Default: primary color background with white logo
<Logo variant="plain" />    // Just the logo without background
```

### Logo with Text

```tsx
import Logo from '@/components/Logo';

<div className="flex items-center space-x-3">
  <Logo width={40} height={40} priority />
  <div className="text-2xl font-bold text-gray-900">
    Paper Thread
  </div>
</div>
```

## 🎯 Step 4: Logo Configuration

The logo configuration is managed in `frontend/src/lib/logoConfig.ts`:

- **Variants**: Different logo versions and styles
  - `rounded`: Primary color background with white logo (default)
  - `plain`: Just the logo without background
  - `primary`: Original logo styling
  - `white`: White version for dark backgrounds
- **Dimensions**: Predefined sizes (small, medium, large, xlarge)
- **Fallbacks**: Automatic format fallback handling

## 🚀 Step 5: Production Optimization

### Next.js Image Optimization

The logo automatically benefits from Next.js image optimization:
- Automatic WebP conversion
- Responsive sizing
- Lazy loading (unless `priority` is set)

### Performance Best Practices

1. **Use SVG for logos** - They're scalable and lightweight
2. **Set `priority` for above-the-fold logos** - Ensures immediate loading
3. **Provide PNG fallback** - For older browsers that don't support SVG
4. **Optimize in Figma** - Remove unnecessary elements before export

## 🔍 Step 6: Testing Your Logo

1. **Local development**: Run `npm run dev` and check the logo displays
2. **Different screen sizes**: Test on mobile, tablet, and desktop
3. **Browser compatibility**: Test in Chrome, Firefox, Safari, Edge
4. **Production build**: Run `npm run build` and `npm start` to test production

## 🎨 Customization Options

### Logo Variants

The Logo component now supports multiple variants:

1. **`rounded` (default)**: Your logo appears in a rounded square with your primary brand color background, and the logo itself is converted to white using CSS filters. This gives you the classic "logo in a colored box" look.

2. **`plain`**: Just your logo without any background, displayed in its original colors.

3. **`primary`**: The original logo styling (if you want to override the default).

```tsx
// Examples
<Logo variant="rounded" />  // Primary color background, white logo
<Logo variant="plain" />    // Just the logo, no background
<Logo variant="primary" />  // Original styling
```

### Adding Logo Variants

To add a white version for dark backgrounds:

1. Export white logo variants from Figma
2. Add to `frontend/public/images/`:
   ```
   logo-white.svg
   logo-white.png
   logo-white.webp
   ```
3. The configuration already includes the white variant

### Changing Logo Colors

- **SVG**: Edit colors directly in the SVG file
- **PNG/WebP**: Re-export from Figma with new colors

## 🐛 Troubleshooting

### Logo Not Displaying

1. Check file paths in `frontend/public/images/`
2. Verify file names match the configuration
3. Check browser console for errors
4. Ensure files are committed to version control

### Logo Looks Blurry

1. Export at higher resolution from Figma
2. Use SVG format for crisp display at all sizes
3. Check if the logo is being scaled up beyond its intended size

### Performance Issues

1. Optimize SVG in Figma before export
2. Use appropriate image formats (SVG for logos, PNG for photos)
3. Consider using `priority` only for above-the-fold logos

## 📱 Mobile Considerations

- Ensure logo is readable at small sizes
- Test touch targets (minimum 44x44px recommended)
- Consider mobile-first design principles

## 🌐 Browser Support

- **SVG**: Modern browsers (IE9+)
- **PNG**: All browsers
- **WebP**: Modern browsers (automatic fallback to PNG)

## 📝 Maintenance

- Keep logo files organized in `frontend/public/images/`
- Update configuration when adding new variants
- Test logo display after major updates
- Consider logo versioning for major brand changes

---

**Need help?** Check the component files or refer to the Next.js Image component documentation for advanced usage. 