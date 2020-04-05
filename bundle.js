
const fs = require('fs')
const path = require('path')
const parse = require('@babel/parser')
const traverse = require("@babel/traverse")
const babel = require('@babel/core')

const moduleAnalyser = (filename)=>{
  const content = fs.readFileSync(filename,'utf-8')
  
  let ast =  parse.parse(content,{
    sourceType: "module",
  })
 
  let dependencies = {}
  traverse.default(ast,{
    ImportDeclaration:({node})=>{
      // dependencies.push(node.source.value)
      const dirname = path.dirname(filename)
      const newFile = './' + path.join(dirname,node.source.value)
      dependencies[node.source.value] = newFile
    }
  })
  const {code} = babel.transformFromAst(ast, null ,{
    presets: ['@babel/preset-env']
  })
  // console.log(code)
  return{
    filename,
    dependencies,
    code
  }
}

const makeDependencisGraph = (entry)=>{
  const entryModule = moduleAnalyser(entry)
  const graphArray = [entryModule]
  for(let i = 0;i < graphArray.length;i++){
    const item = graphArray[i]
    const {dependencies} = item
    if(dependencies){
      for(let j in dependencies){
        graphArray.push(
          moduleAnalyser(dependencies[j])
        )
        
      }
      
    }
  }
  const graph = {}
  graphArray.forEach(item=>{
    graph[item.filename]={
      dependencies:item.dependencies,
      code:item.code
    }
  })
  return graph
}

const generateCode = (entry)=>{
  const graph = JSON.stringify(makeDependencisGraph(entry))

  return `
    (function(graph){
      function require(module){
        function localRequire(relationPath){
          return require(graph[module].dependencies[relationPath])
        }
        var exports = {};
        (function(require,exports,code){
          eval(code)
        })(localRequire,exports,graph[module].code)
        return exports
      }
      require('${entry}')
    })(${graph})
  `
}
let ret = generateCode('./src/index.js')
console.log(ret)



