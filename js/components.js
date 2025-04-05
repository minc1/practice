/**
 * ForensicFinancials Component System
 * Core component architecture for the application
 */

// Base Component Class
class Component {
    constructor(container, props = {}) {
      this.container = typeof container === 'string' ? document.querySelector(container) : container;
      this.props = props;
      this.state = {};
      this.rendered = false;
      
      if (!this.container) {
        console.error(`Container not found: ${container}`);
      }
    }
    
    setState(newState) {
      this.state = { ...this.state, ...newState };
      if (this.rendered) this.render();
    }
    
    render() {
      // To be implemented by child classes
      this.rendered = true;
    }
    
    mount() {
      this.render();
      this.afterMount();
    }
    
    afterMount() {
      // Hook for post-render operations
    }
    
    unmount() {
      // Cleanup resources
      if (this.container) {
        this.container.innerHTML = '';
      }
      this.rendered = false;
    }
  }
  
  // Component Registry for tracking and managing components
  const ComponentRegistry = {
    components: new Map(),
    
    register(id, component) {
      this.components.set(id, component);
      return component;
    },
    
    get(id) {
      return this.components.get(id);
    },
    
    unmountAll() {
      this.components.forEach(component => component.unmount());
    },
    
    unmountById(id) {
      const component = this.get(id);
      if (component) {
        component.unmount();
        this.components.delete(id);
      }
    }
  };
  
  // Event Bus for component communication
  const EventBus = {
    events: {},
    
    subscribe(event, callback) {
      if (!this.events[event]) this.events[event] = [];
      this.events[event].push(callback);
      return () => this.unsubscribe(event, callback);
    },
    
    unsubscribe(event, callback) {
      if (this.events[event]) {
        this.events[event] = this.events[event].filter(cb => cb !== callback);
      }
    },
    
    publish(event, data) {
      if (this.events[event]) {
        this.events[event].forEach(callback => callback(data));
      }
    }
  };
  
  // Card Component
  class CardComponent extends Component {
    constructor(container, props) {
      super(container, {
        title: 'Untitled Card',
        iconClass: 'fas fa-question-circle neutral',
        points: [],
        footer: '',
        ...props
      });
    }
    
    render() {
      const { title, iconClass, points, footer } = this.props;
      
      if (!this.container) return;
      
      this.container.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h3><i class="${iconClass}"></i> ${title || 'Untitled Card'}</h3>
          </div>
          <div class="card-body">
            <ul>
              ${(points && Array.isArray(points)) ? points.map(point => `<li>${point}</li>`).join('') : '<li>No points provided.</li>'}
            </ul>
          </div>
          ${footer ? `<div class="card-footer">${footer}</div>` : ''}
        </div>
      `;
      
      super.render();
    }
  }
  
  // Chart Component
  class ChartComponent extends Component {
    constructor(container, props) {
      super(container, {
        type: 'line',
        title: 'Chart',
        data: { labels: [], datasets: [] },
        options: {},
        ...props
      });
      this.chartInstance = null;
    }
    
    render() {
      const { title } = this.props;
      
      if (!this.container) return;
      
      if (!this.rendered) {
        this.container.innerHTML = `
          <div class="chart-container">
            <div class="chart-header">
              <h3>${title}</h3>
            </div>
            <div class="chart-wrapper">
              <canvas id="${this.container.id}-canvas"></canvas>
            </div>
          </div>
        `;
      }
      
      this.renderChart();
      super.render();
    }
    
    renderChart() {
      const canvas = document.getElementById(`${this.container.id}-canvas`);
      if (!canvas) return;
      
      if (this.chartInstance) {
        this.chartInstance.destroy();
      }
      
      try {
        this.chartInstance = new Chart(canvas.getContext('2d'), {
          type: this.props.type,
          data: this.props.data,
          options: this.props.options
        });
      } catch (error) {
        console.error(`Error creating chart: ${error.message}`);
      }
    }
    
    updateData(newData) {
      this.props.data = { ...this.props.data, ...newData };
      if (this.chartInstance) {
        Object.assign(this.chartInstance.data, this.props.data);
        this.chartInstance.update();
      }
    }
    
    updateOptions(newOptions) {
      this.props.options = { ...this.props.options, ...newOptions };
      if (this.chartInstance) {
        Object.assign(this.chartInstance.options, this.props.options);
        this.chartInstance.update();
      }
    }
    
    unmount() {
      if (this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
      }
      super.unmount();
    }
  }
  
  // Table Component
  class TableComponent extends Component {
    constructor(container, props) {
      super(container, {
        headers: [],
        rows: [],
        responsive: true,
        ...props
      });
    }
    
    render() {
      const { headers, rows, responsive } = this.props;
      
      if (!this.container) return;
      
      this.container.innerHTML = `
        <div class="insight-list">
          <table>
            <thead>
              <tr>
                ${headers.map(header => `<th>${header}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${rows.length ? rows.map(row => `
                <tr>
                  ${row.map((cell, i) => `<td data-label="${headers[i] || ''}">${cell}</td>`).join('')}
                </tr>
              `).join('') : `<tr><td colspan="${headers.length}" style="text-align: center; color: var(--muted);">No data available</td></tr>`}
            </tbody>
          </table>
        </div>
      `;
      
      super.render();
    }
    
    updateData(newRows) {
      this.props.rows = newRows;
      this.render();
    }
  }
  
  // Message Component
  class MessageComponent extends Component {
    constructor(container, props) {
      super(container, {
        message: '',
        type: 'loading', // loading, error, success
        ...props
      });
    }
    
    render() {
      const { message, type } = this.props;
      
      if (!this.container) return;
      
      if (message) {
        this.container.className = `message-area ${type}`;
        this.container.style.display = 'flex';
        
        const messageP = this.container.querySelector('p');
        if (messageP) {
          messageP.innerHTML = message;
        } else {
          this.container.innerHTML = `<p>${message}</p>`;
        }
      } else {
        this.container.style.display = 'none';
      }
      
      super.render();
    }
    
    showMessage(message, type = 'loading') {
      this.props.message = message;
      this.props.type = type;
      this.render();
      return !!message; // Return whether a message is being shown
    }
  }
  
  // Dynamic Content Component
  class DynamicContentComponent extends Component {
    constructor(container, props) {
      super(container, {
        content: '',
        property: 'textContent', // textContent or innerHTML
        ...props
      });
    }
    
    render() {
      const { content, property } = this.props;
      
      if (!this.container) return;
      
      if (content !== undefined && content !== null) {
        if (property === 'innerHTML') {
          this.container.innerHTML = content;
        } else {
          this.container.textContent = content;
        }
      } else {
        this.container[property] = '';
      }
      
      super.render();
    }
    
    updateContent(content) {
      this.props.content = content;
      this.render();
    }
  }
  
  // Component Factory
  const ComponentFactory = {
    createCardGroup(containerId, cards = []) {
      const container = document.getElementById(containerId);
      if (!container) return [];
      
      // Clear container
      container.innerHTML = '';
      
      if (!Array.isArray(cards) || cards.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--muted);">No card data available.</p>';
        return [];
      }
      
      // Create card components
      return cards.map((cardData, index) => {
        const cardContainer = document.createElement('div');
        cardContainer.id = `${containerId}-card-${index}`;
        container.appendChild(cardContainer);
        
        const cardComponent = new CardComponent(`#${cardContainer.id}`, cardData);
        cardComponent.mount();
        
        return ComponentRegistry.register(
          `${containerId}-card-${index}`,
          cardComponent
        );
      });
    },
    
    createTable(containerId, headers, rows) {
      const container = document.getElementById(containerId);
      if (!container) return null;
      
      const tableComponent = new TableComponent(`#${containerId}`, {
        headers,
        rows
      });
      
      tableComponent.mount();
      
      return ComponentRegistry.register(
        `table-${containerId}`,
        tableComponent
      );
    },
    
    createList(containerId, items, useInnerHTML = false) {
      const container = document.getElementById(containerId);
      if (!container) return null;
      
      // Clear container
      container.innerHTML = '';
      
      if (!Array.isArray(items)) {
        container.innerHTML = '<li class="error-message" style="color: var(--danger);">Error loading list data.</li>';
        return null;
      }
      
      if (items.length === 0) {
        container.innerHTML = '<li style="color: var(--muted);">No list items available.</li>';
        return null;
      }
      
      items.forEach(item => {
        const li = document.createElement('li');
        if (useInnerHTML) {
          li.innerHTML = item || '';
        } else {
          li.textContent = item || '';
        }
        container.appendChild(li);
      });
      
      return container;
    }
  };
