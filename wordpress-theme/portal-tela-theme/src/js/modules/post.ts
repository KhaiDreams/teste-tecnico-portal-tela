/**
 * Post interactions module
 */

export function setupPostInteractions(): void {
  setupTableOfContents();
  setupCopyCodeBlocks();
  setupImageLightbox();
}

/**
 * Setup table of contents generation
 */
function setupTableOfContents(): void {
  const postContent = document.querySelector('.post-content');
  if (!postContent) return;

  const headings = Array.from(postContent.querySelectorAll('h2, h3'));
  if (headings.length === 0) return;

  // Create table of contents container
  const toc = document.createElement('div');
  toc.className = 'table-of-contents card mb-4';
  toc.innerHTML = '<div class="card-header"><h3 class="mb-0">Índice</h3></div>';

  const tocList = document.createElement('ul');
  tocList.className = 'list-unstyled p-3';

  headings.forEach((heading, index) => {
    const id = heading.id || `heading-${index}`;
    heading.id = id;

    const li = document.createElement('li');
    const level = parseInt(heading.tagName[1]);
    li.className = `toc-level-${level}`;
    li.style.marginLeft = `${(level - 2) * 1.5}rem`;

    const a = document.createElement('a');
    a.href = `#${id}`;
    a.textContent = heading.textContent || '';
    a.className = 'text-decoration-none';

    li.appendChild(a);
    tocList.appendChild(li);
  });

  toc.appendChild(tocList);

  // Insert table of contents after post excerpt
  const postHeader = document.querySelector('.post-header');
  if (postHeader && postHeader.nextElementSibling) {
    postHeader.nextElementSibling.parentNode?.insertBefore(
      toc,
      postHeader.nextElementSibling
    );
  } else if (postContent) {
    postContent.parentNode?.insertBefore(toc, postContent);
  }
}

/**
 * Setup copy button for code blocks
 */
function setupCopyCodeBlocks(): void {
  const codeBlocks = document.querySelectorAll('pre');

  codeBlocks.forEach((preElement) => {
    // Create copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-sm btn-outline-secondary copy-code-btn';
    copyBtn.innerHTML = '📋 Copy';
    copyBtn.style.position = 'absolute';
    copyBtn.style.top = '0.5rem';
    copyBtn.style.right = '0.5rem';

    // Wrap pre in a container
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.style.width = '100%';

    preElement.parentNode?.insertBefore(wrapper, preElement);
    wrapper.appendChild(preElement);
    wrapper.appendChild(copyBtn);

    // Add click handler
    copyBtn.addEventListener('click', async () => {
      const code = preElement.textContent || '';

      try {
        await navigator.clipboard.writeText(code);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = 'Copied!';

        setTimeout(() => {
          copyBtn.innerHTML = originalText;
        }, 2000);
      } catch (error) {
        console.error('Failed to copy code:', error);
        copyBtn.innerHTML = '❌ Failed';
      }
    });
  });
}

/**
 * Setup lightbox for images
 */
function setupImageLightbox(): void {
  const images = document.querySelectorAll('.post-content img');

  images.forEach((img) => {
    const image = img as HTMLImageElement;
    if (image.parentElement?.tagName !== 'A') {
      const link = document.createElement('a');
      link.href = image.src;
      link.className = 'image-lightbox';
      link.target = '_blank';

      image.parentNode?.insertBefore(link, image);
      link.appendChild(image);
    }
  });
}
