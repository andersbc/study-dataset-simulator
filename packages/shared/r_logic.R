# --- Generator Logic ---
generate_study <- function(n, design) {
  
  # Initialize Data
  dd <- genData(n)
  
  # Lookup helper for node properties
  get_node <- function(name) {
    for(item in design) { if(item$name == name) return(item) }
    return(NULL)
  }

  get_config_safe <- function(name, design) {
    for(d in design) { if(d$name == name) return(d) }
    return(list(sd=1, mean=0)) # Fallback
  }

  for(node in design) {
    formula <- "0"
    dist_type <- "normal"
    variance <- 0
    link <- "identity"

    # 1. Effects Calculation
    # We calculate the Linear Predictor (LP) to find the 'explained mean' and 'explained variance'
    # lp_vector represents (Intercept_adjustment + Sum(coef * parent))
    # But wait, intercept adjustment tries to center it.
    
    # We use theoretical params for coefficient scaling to be stable
    
    parent_shift <- 0
    effect_formula <- ""
    
    # Vector to hold the sum of (coef * parent_data) for variance calc
    # val_vector starts at 0
    lp_comp_vector <- rep(0, n)
    has_parents <- FALSE

    for(parent in node$parents) {
       has_parents <- TRUE
       p_node <- get_config_safe(parent$source, design) 
       coef <- parent$coef

       # Correlation to Beta Conversion (Normal-Normal)
       if(parent$type == "correlation" && node$type == "normal") {
          if(!is.null(p_node$sd)) {
             coef <- coef * (node$sd / p_node$sd)
             
             # Theoretical Shift (Population level)
             parent_shift <- parent_shift + (coef * p_node$mean)
          }
       }

       effect_formula <- paste0(effect_formula, " + ", coef, " * ", parent$source)
       
       # Empirical Variance Component
       if (parent$source %in% names(dd)) {
         lp_comp_vector <- lp_comp_vector + (coef * dd[[parent$source]])
       }
    }

    # 2. Distribution Setup
    if(node$type == "categorical") {
       dist_type <- "categorical"
       formula <- paste(node$probs, collapse = ";")
    } else if(node$type == "normal") {
       dist_type <- "normal"
       
       # Variance Adjustment (Empirical)
       # If we have parents, the variance of the generated variable will be:
       # Var(Y) = Var(LP) + Var(Error)
       # We want Var(Y) = node$sd^2
       # So Var(Error) = node$sd^2 - Var(LP)
       
       total_var <- node$sd^2
       explained_var <- 0
       
       if (has_parents) {
         explained_var <- var(lp_comp_vector)
       }
       
       variance <- total_var - explained_var
       if(variance < 0) variance <- 0 # Impossible to satisfy

       # Intercept Adjustment (Theoretical)
       # We want Mean(Y) = node$mean
       # Y = Intercept + LP_mean + Error_mean(0)
       # Intercept = node$mean - Theoretical_LP_mean (parent_shift)
       # We use theoretical shift to target population parameters, though sample mean might drift.
       intercept <- node$mean - parent_shift
       
       formula <- paste0(intercept, effect_formula)
       
    } else if(node$type == "uniform") {
       dist_type <- "uniform"
       formula <- paste0(node$min, ";", node$max)
    }

    # Define & Generate Single Column
    def <- defData(NULL, varname=node$name, formula=formula, variance=variance, dist=dist_type)
    dd <- addColumns(def, dd)
  }

  # 3. Post-Processing (Factors)
  for(node in design) {
     if(node$type == "categorical" && !is.null(node$labels)) {
        dd[[node$name]] <- factor(dd[[node$name]], labels=node$labels)
     }
  }

  # 4. Reorder
  # Extract explicit order indices if present
  node_names <- c()
  node_orders <- c()
  
  for(node in design) {
     node_names <- c(node_names, node$name)
     # Use high number (9999) if order is missing to push to end
     ord <- if(!is.null(node$order)) node$order else 9999
     node_orders <- c(node_orders, ord)
  }
  
  # Sort names by order
  sorted_names <- node_names[order(node_orders)]
  
  # Intersect with actual data columns
  existing_cols <- names(dd)
  final_order <- c()
  if("id" %in% existing_cols) final_order <- c("id")
  
  final_order <- c(final_order, intersect(sorted_names, existing_cols))
  
  # Add remaining columns
  remaining <- setdiff(existing_cols, final_order)
  final_order <- c(final_order, remaining)
  
  setcolorder(dd, final_order)

  return(dd)
}
