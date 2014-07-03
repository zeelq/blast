###A web framework based on Koa

__blast__ 是在 [koa](https://github.com/koajs/koa) 的基础上扩展的支持多项目、bigpipe、gearman调用、多数据库支持的框架

## 安装
```
$ npm install koa-blast
```  
和  [koa](https://github.com/koajs/koa) 一样，您需要安装 0.11.9 或更高的版本的 node，并且运行时需要加上 `--harmony` 参数.如果您不想每次运行都手动添加，可以在您的 shell 配置文件中添加一个 alias，代码如下：

```
alias node='node --harmony'
```
通过 npm 安装之后，blast 的目录名为 koa-blast， 建议手动修改为 blast

进入blast 目录，执行 `npm install` 安装依赖包，blast安装完毕：


## 如何开始

安装好blast之后，您还需要创建一个项目目录，目前您需要手动完成这件工作，后续会加上自动创建新项目的功能，在您的项目目录执行以下代码来创建一个新项目：

```
mkdir blast_demo
touch settings.js
touch settings.js
mkdir blast_demo/controllers
mkdir blast_demo/views
```
至此，新项目已经准备就绪，您可以在命令行执行以下命令来启动服务：

```
node path_to_blast/index -d path_to_blast_demo
```
例如，您的 blast 安装在 `/opt` 目录下， blast_demo 在 `/opt/project` 里面,那么启动的命令为：

```
node /opt/blast/index.js -d /opt/project/blast_demo
```

您也可以在您的shell配置文件中添加一个 alias

```
alias blast="node /opt/blast/index.js"
```

启动完成之后，浏览器访问：`http://127.0.0.1:8888` 您将看到一个欢迎页面

## 启动参数

启动时，可以传递以下几个参数给 blast：

`-d：必须，指定项目所在位置`

`-e：可选，执行运行环境，可选的值有3个：development,testing,production,默认 development`

`-c：可选，自定义项目配置，和－e作用相同，但优先级更高`

`-p：可选，端口号，默认：8888`


## 添加自己的页面（路由和模板）

由 blast 驱动的项目，所有的路有你存位于创建项目时创建的那个 `controllers` 目录下

服务启动时，会加载该目录下的js文件，子目录或非.js 文件将被忽略。

一个合法的 controller 应该导出一个构造函数，每个 path 作为该构造函数实例的属性，我们在 `controllers` 目录下新建一个 index.js 文件，输入以下代码

```
module.exports = function(app) {
    // app 即 ext-koa 返回的 Application 的实例
    this['/'] = function() {
        this.render('index');
    };
}

```
这里我们不返回 hello world 之类的无用的字符串，直接渲染一个页面，this 对象上的一些方法下面会有详细介绍

保存之后，刷新页面，会发现服务直接重启，且页面无法显示

这是因为 `render` 方法没有找到要渲染的页面所导致的，接下来我们要做的就是在 `views` 目录下新建这个模版

views/index.html 的内容为：
```
<html>
    <head>
        <title>Blast Demo</title>
    </head>
    
    <body>
    Hi, I am the first balst page!
    </body>
</html>
```
保存，再次刷新页面，OK，不出意外，您已经可以看到页面愉快的听话的输出了：Hi，I am the first blast page！

**controller文件解析规则**

* 对于在 `index.js` 中定义的路由，都直接添加到根路径后面的，比如上面的 `/`。

如果还有其他的，比如 list，那么真实路径就是 `http://www.domain.com/list`

`index.js` 之外的其他文件，会自动把文件名添加到根路径后面，然后把定义的路径加到这个路径下，如 account.js 下有个 user

```
// account.js
module.exports = function() {
    this.user =  function() {
        this.render('user');
    };
};
```
这个的真实路径就是 `http://www.domain.com/account/user`

* 所有的路径，会自动忽略最后的 /， 即 http://www.domain.com/account/user/ 和 http://www.domain.com/account/user 是等价的

* 所有的， index 等价于 /， 即访问 http://www.domain.com/ 和 http://www.domain.com/index 是等价的


**关于模板**

渲染一个模板的时候，可以忽略后缀，默认后缀为 `.html`, 也可以在配置文件中进行后缀名设置，详细配置下面有详细介绍

默认的模板目录就是 `项目目录/views`，传入render方法的时候，只需要写想相对于 views 的相对路径即可，如：
index.html 直接位于 views 目录下，只要传入 'index' 即可，如果 views 还有个 account 子目录，里面有个user.html,要渲染该模板，传入 'account/user' 即可
